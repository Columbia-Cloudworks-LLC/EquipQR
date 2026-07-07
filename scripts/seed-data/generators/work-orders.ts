/**
 * Volume work-order generator: work orders across every lifecycle status with
 * progress notes, itemized costs, and part consumption wired back into
 * inventory transactions — the "work orders that have consumed parts"
 * scenario from issue #1164.
 *
 * All generated work orders are dated in 2025 so the durable-core fixtures
 * (dated 2026-01) stay newest for recency-sorted list assertions in E2E.
 */

import { SeededRng } from '../rng';
import { ORGS, ORG_KEYS, UUID_PREFIXES, type OrgRef, type OrgUser } from '../reference-data';
import { deterministicUuid, escapeSql, renderSeedFile, uuidLiteral } from '../sql-builder';
import type { GeneratedEquipment } from './equipment';
import type { GeneratedInventoryItem } from './inventory';

const BASE_WORK_ORDERS_PER_ORG = 12;

type WorkOrderStatus =
  | 'submitted'
  | 'accepted'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

/** Weighted status mix: history-heavy so cost/consumption data dominates. */
const STATUS_POOL: WorkOrderStatus[] = [
  'submitted',
  'accepted',
  'assigned',
  'in_progress',
  'in_progress',
  'on_hold',
  'completed',
  'completed',
  'completed',
  'completed',
  'completed',
  'cancelled',
];

const WORK_TYPES = [
  { title: 'Hydraulic System Service', description: 'Inspect hydraulic lines, replace filters, and top off fluid.' },
  { title: 'Engine Oil & Filter Change', description: 'Scheduled oil change with filter replacement and fluid check.' },
  { title: 'Brake Inspection & Repair', description: 'Inspect brake wear, replace pads as needed, and bleed lines.' },
  { title: 'Electrical Fault Diagnosis', description: 'Trace intermittent electrical fault and replace faulty components.' },
  { title: 'Annual Safety Inspection', description: 'Complete annual safety inspection checklist and remediate findings.' },
  { title: 'Tire Replacement', description: 'Replace worn tires and torque wheel hardware to spec.' },
  { title: 'Cooling System Flush', description: 'Flush coolant, replace thermostat, and pressure-test the system.' },
  { title: 'Undercarriage Rebuild', description: 'Measure undercarriage wear and replace rollers and track hardware.' },
  { title: 'Battery Replacement', description: 'Load-test batteries and replace units below capacity threshold.' },
  { title: 'Preventive Maintenance Service', description: 'Scheduled PM service per manufacturer interval checklist.' },
  { title: 'Attachment Repair', description: 'Repair attachment coupler and replace worn bushings and pins.' },
  { title: 'Warning Light Investigation', description: 'Diagnose active fault codes and clear after repair.' },
];

const PROGRESS_NOTES = [
  'Started teardown and confirmed the reported symptom.',
  'Parts pulled from stock. Beginning replacement now.',
  'Completed repair and verified operation under load.',
  'Waiting on parts delivery before work can continue.',
  'Performed initial diagnostics and documented findings.',
  'Final inspection passed. Cleaning up work area.',
];

interface ConsumptionEvent {
  item: GeneratedInventoryItem;
  quantity: number;
  workOrderId: string;
  workOrderTitle: string;
  userId: string;
  /** Days ago (larger = older). */
  daysAgo: number;
}

export interface WorkOrderDomainResult {
  sql: string;
  summary: { workOrders: number; notes: number; costs: number; transactions: number };
}

function ts(daysAgo: number, hour: number): string {
  return `NOW() - INTERVAL '${daysAgo} days' + INTERVAL '${hour} hours'`;
}

function dateOnly(daysAgo: number): string {
  return `(NOW() - INTERVAL '${daysAgo} days')::date`;
}

/**
 * Pick an assignee the work_orders trigger accepts
 * (is_valid_work_order_assignee): org owners/admins for any equipment,
 * plus manager/technician team members of the equipment's team.
 */
function pickValidAssignee(rng: SeededRng, org: OrgRef, teamId: string | null): OrgUser {
  if (teamId === null) {
    return rng.choice(org.admins);
  }
  const team = org.teams.find((t) => t.id === teamId);
  return rng.choice(team?.assignees ?? org.admins);
}

export function generateWorkOrderDomain(
  scale: number,
  equipment: GeneratedEquipment[],
  inventoryItems: GeneratedInventoryItem[],
): WorkOrderDomainResult {
  const rng = new SeededRng(32345);

  const woRows: string[] = [];
  const noteRows: string[] = [];
  const costRows: string[] = [];
  const consumptions: ConsumptionEvent[] = [];

  let woCounter = 100;
  let noteCounter = 100;
  let costCounter = 100;

  for (const orgKey of ORG_KEYS) {
    const org = ORGS[orgKey];
    const orgEquipment = equipment.filter((eq) => eq.orgKey === orgKey);
    const orgItems = inventoryItems.filter((item) => item.orgKey === orgKey && item.quantityOnHand > 0);
    const count = BASE_WORK_ORDERS_PER_ORG * scale;

    for (let i = 0; i < count; i++) {
      const id = deterministicUuid(UUID_PREFIXES.workOrder, woCounter++);
      const status = rng.choice(STATUS_POOL);
      const workType = rng.choice(WORK_TYPES);
      const eq = rng.choice(orgEquipment);
      const creator = rng.choice(org.staff);
      const title = `${workType.title} - ${eq.name}`;

      // Created 20-300 days ago; terminal statuses resolve 1-14 days later.
      const createdDaysAgo = rng.int(20, 300);
      const resolvedDaysAgo = Math.max(3, createdDaysAgo - rng.int(1, 14));
      const isTerminal = status === 'completed' || status === 'cancelled';
      const hasAssignee = status !== 'submitted' && status !== 'cancelled';
      const assignee = hasAssignee ? pickValidAssignee(rng, org, eq.teamId) : null;
      const priority = rng.choice(['low', 'medium', 'medium', 'high'] as const);
      const estimatedHours = rng.int(1, 12);

      woRows.push(
        [
          uuidLiteral(id),
          uuidLiteral(org.id),
          uuidLiteral(eq.id),
          escapeSql(title),
          escapeSql(workType.description),
          `'${status}'`,
          `'${priority}'`,
          uuidLiteral(assignee?.id ?? null),
          escapeSql(assignee?.name ?? null),
          uuidLiteral(eq.teamId),
          uuidLiteral(creator.id),
          escapeSql(creator.name),
          dateOnly(createdDaysAgo),
          dateOnly(Math.max(1, createdDaysAgo - rng.int(3, 21))),
          String(estimatedHours),
          status === 'completed' ? ts(resolvedDaysAgo, rng.int(8, 17)) : 'NULL',
          ts(isTerminal ? resolvedDaysAgo : rng.int(1, Math.min(createdDaysAgo, 10)), rng.int(8, 17)),
        ].join(', '),
      );

      // Progress notes on active/terminal work.
      if (status === 'in_progress' || status === 'on_hold' || status === 'completed') {
        const noteCount = rng.int(1, 2);
        for (let n = 0; n < noteCount; n++) {
          const author = assignee ?? creator;
          noteRows.push(
            [
              uuidLiteral(deterministicUuid(UUID_PREFIXES.workOrderNote, noteCounter++)),
              uuidLiteral(id),
              uuidLiteral(author.id),
              escapeSql(rng.choice(PROGRESS_NOTES)),
              String(rng.int(0, 4)),
              String(rng.next() < 0.15),
              ts(Math.max(2, resolvedDaysAgo + n), 9 + n),
              ts(Math.max(2, resolvedDaysAgo + n), 9 + n),
            ].join(', '),
          );
        }
      }

      // Completed work orders consume parts: itemized costs + stock movement.
      if (status === 'completed' && orgItems.length > 0) {
        const worker = assignee ?? creator;
        const partCount = rng.int(1, 3);
        const usedItemIds = new Set<string>();

        for (let p = 0; p < partCount; p++) {
          const item = rng.choice(orgItems);
          if (usedItemIds.has(item.id)) continue;
          usedItemIds.add(item.id);

          const quantity = rng.int(1, 3);
          costRows.push(
            [
              uuidLiteral(deterministicUuid(UUID_PREFIXES.workOrderCost, costCounter++)),
              uuidLiteral(id),
              escapeSql(item.name),
              uuidLiteral(item.id),
              String(quantity),
              String(Math.round(item.defaultUnitCost * 100)),
              uuidLiteral(worker.id),
              escapeSql(worker.name),
              ts(resolvedDaysAgo, 14),
              ts(resolvedDaysAgo, 14),
            ].join(', '),
          );
          consumptions.push({
            item,
            quantity,
            workOrderId: id,
            workOrderTitle: title,
            userId: worker.id,
            daysAgo: resolvedDaysAgo,
          });
        }

        // Labor line (no inventory link).
        const laborHours = rng.int(1, 8);
        costRows.push(
          [
            uuidLiteral(deterministicUuid(UUID_PREFIXES.workOrderCost, costCounter++)),
            uuidLiteral(id),
            escapeSql(`Labor - ${laborHours} hours`),
            'NULL',
            '1',
            String(laborHours * rng.int(9500, 14500)),
            uuidLiteral(worker.id),
            escapeSql(worker.name),
            ts(resolvedDaysAgo, 15),
            ts(resolvedDaysAgo, 15),
          ].join(', '),
        );
      }
    }
  }

  // Build a consistent inventory_transactions chain per item so the audit
  // trail reconciles with each item's seeded quantity_on_hand.
  const transactionRows: string[] = [];
  let txCounter = 100;
  const byItem = new Map<string, ConsumptionEvent[]>();
  for (const event of consumptions) {
    const list = byItem.get(event.item.id) ?? [];
    list.push(event);
    byItem.set(event.item.id, list);
  }

  for (const events of byItem.values()) {
    // Oldest first (largest daysAgo first).
    events.sort((a, b) => b.daysAgo - a.daysAgo);
    const totalConsumed = events.reduce((sum, e) => sum + e.quantity, 0);
    let running = events[0].item.quantityOnHand + totalConsumed;

    for (const event of events) {
      const next = running - event.quantity;
      transactionRows.push(
        [
          uuidLiteral(deterministicUuid(UUID_PREFIXES.inventoryTransaction, txCounter++)),
          uuidLiteral(event.item.id),
          uuidLiteral(event.item.organizationId),
          uuidLiteral(event.userId),
          String(running),
          String(next),
          String(-event.quantity),
          `'work_order'`,
          uuidLiteral(event.workOrderId),
          escapeSql(`Consumed on: ${event.workOrderTitle}`),
          ts(event.daysAgo, 14),
        ].join(', '),
      );
      running = next;
    }
  }

  const sql = renderSeedFile({
    fileTitle: 'Generated Seed Data - Work Orders, Costs & Part Consumption',
    descriptionLines: [
      `Scale: ${scale} (${woRows.length} work orders, ${costRows.length} cost lines, ${transactionRows.length} stock movements)`,
      'Completed work orders carry itemized costs and reconciled inventory transactions.',
    ],
    sections: [
      {
        title: 'WORK ORDERS',
        insert: {
          table: 'public.work_orders',
          columns: [
            'id', 'organization_id', 'equipment_id', 'title', 'description', 'status', 'priority',
            'assignee_id', 'assignee_name', 'team_id', 'created_by', 'created_by_name',
            'created_date', 'due_date', 'estimated_hours', 'completed_date', 'updated_at',
          ],
          rows: woRows,
        },
      },
      {
        title: 'WORK ORDER NOTES',
        insert: {
          table: 'public.work_order_notes',
          columns: ['id', 'work_order_id', 'author_id', 'content', 'hours_worked', 'is_private', 'created_at', 'updated_at'],
          rows: noteRows,
        },
      },
      {
        title: 'WORK ORDER COSTS',
        insert: {
          table: 'public.work_order_costs',
          columns: [
            'id', 'work_order_id', 'description', 'inventory_item_id', 'quantity',
            'unit_price_cents', 'created_by', 'created_by_name', 'created_at', 'updated_at',
          ],
          rows: costRows,
        },
      },
      {
        title: 'INVENTORY TRANSACTIONS (work-order consumption)',
        insert: {
          table: 'public.inventory_transactions',
          columns: [
            'id', 'inventory_item_id', 'organization_id', 'user_id', 'previous_quantity',
            'new_quantity', 'change_amount', 'transaction_type', 'work_order_id', 'notes', 'created_at',
          ],
          rows: transactionRows,
        },
      },
    ],
  });

  return {
    sql,
    summary: {
      workOrders: woRows.length,
      notes: noteRows.length,
      costs: costRows.length,
      transactions: transactionRows.length,
    },
  };
}
