/**
 * Work orders export row building and spreadsheet mappers.
 */

import {
  calculateDaysOpen,
  formatDate,
  formatDateTime,
  getConditionText,
  truncateId,
} from "./export-formatters.ts";
import { parsePMChecklistData } from "./pm-checklist-parse.ts";
import type {
  AllExportRows,
  EquipmentRow,
  LaborDetailRow,
  MaterialCostRow,
  PMChecklistRow,
  TimelineRow,
  WorkOrderSummaryRow,
} from "./work-orders-export-data.ts";
import type { WorkOrdersWithData } from "./work-orders-export-fetch.ts";

export function buildAllRows(data: WorkOrdersWithData): AllExportRows {
  const summaryRows: WorkOrderSummaryRow[] = [];
  const laborRows: LaborDetailRow[] = [];
  const costRows: MaterialCostRow[] = [];
  const pmRows: PMChecklistRow[] = [];
  const timelineRows: TimelineRow[] = [];
  const equipmentAggMap = new Map<string, EquipmentRow>();

  // Pre-index related data by work_order_id for O(1) lookups (avoids O(n*m) filter scans)
  const notesByWO = new Map<string, typeof data.notes>();
  for (const n of data.notes) {
    const arr = notesByWO.get(n.work_order_id) || [];
    arr.push(n);
    notesByWO.set(n.work_order_id, arr);
  }
  const costsByWO = new Map<string, typeof data.costs>();
  for (const c of data.costs) {
    const arr = costsByWO.get(c.work_order_id) || [];
    arr.push(c);
    costsByWO.set(c.work_order_id, arr);
  }
  const pmByWO = new Map<string, (typeof data.pmData)[number]>();
  for (const p of data.pmData) {
    pmByWO.set(p.work_order_id, p);
  }
  const historyByWO = new Map<string, typeof data.history>();
  for (const h of data.history) {
    const arr = historyByWO.get(h.work_order_id) || [];
    arr.push(h);
    historyByWO.set(h.work_order_id, arr);
  }

  for (const wo of data.workOrders) {
    const woNotes = notesByWO.get(wo.id) || [];
    const woCosts = costsByWO.get(wo.id) || [];
    const woPM = pmByWO.get(wo.id);
    const woHistory = historyByWO.get(wo.id) || [];

    // Get equipment from the map
    const equipment = wo.equipment_id ? data.equipmentMap.get(wo.equipment_id) : null;

    // Get team name from the map
    const teamName = wo.team_id ? data.teamMap.get(wo.team_id) : null;

    const totalLaborHours = woNotes.reduce((sum, n) => sum + (n.hours_worked || 0), 0);
    const totalMaterialCost = woCosts.reduce(
      (sum, c) => sum + (c.total_price_cents || c.quantity * c.unit_price_cents),
      0
    ) / 100;

    // Summary row
    summaryRows.push({
      workOrderId: truncateId(wo.id),
      title: wo.title,
      description: wo.description,
      customerName: equipment?.customer_name || '',
      equipmentName: equipment?.name || '',
      equipmentSerialNumber: equipment?.serial_number || '',
      equipmentLocation: equipment?.location || '',
      status: wo.status.replace(/_/g, ' ').toUpperCase(),
      priority: wo.priority.toUpperCase(),
      createdDate: formatDate(wo.created_date),
      dueDate: formatDate(wo.due_date),
      completedDate: formatDate(wo.completed_date),
      daysOpen: calculateDaysOpen(wo.created_date, wo.completed_date),
      totalLaborHours,
      totalMaterialCost,
      pmStatus: woPM?.status?.replace(/_/g, ' ').toUpperCase() || 'N/A',
      assignee: wo.assignee_name || 'Unassigned',
      team: teamName || 'Unassigned',
    });

    // Labor rows
    for (const note of woNotes) {
      laborRows.push({
        workOrderId: truncateId(wo.id),
        workOrderTitle: wo.title,
        date: formatDateTime(note.created_at),
        technician: note.author_name || 'Unknown',
        hoursWorked: note.hours_worked || 0,
        notes: note.content,
        hasPhotos: (note.image_count || 0) > 0,
        photoCount: note.image_count || 0,
      });
    }

    // Cost rows
    for (const cost of woCosts) {
      costRows.push({
        workOrderId: truncateId(wo.id),
        workOrderTitle: wo.title,
        equipmentName: equipment?.name || '',
        itemDescription: cost.description,
        quantity: cost.quantity,
        unitPrice: cost.unit_price_cents / 100,
        totalPrice: (cost.total_price_cents || cost.quantity * cost.unit_price_cents) / 100,
        fromInventory: !!cost.inventory_item_id,
        dateAdded: formatDateTime(cost.created_at),
        addedBy: cost.created_by_name || 'Unknown',
      });
    }

    // PM checklist rows
    if (woPM && woPM.checklist_data) {
      const { items: checklistItems, error: parseError } = parsePMChecklistData(
        woPM.checklist_data,
        { workOrderId: wo.id, workOrderTitle: wo.title },
      );

      // If parsing failed, add a warning row to indicate the issue
      if (parseError) {
        pmRows.push({
          workOrderId: truncateId(wo.id),
          workOrderTitle: wo.title,
          equipmentName: equipment?.name || '',
          pmStatus: woPM.status?.replace(/_/g, ' ').toUpperCase() || '',
          completedDate: formatDateTime(woPM.completed_at),
          section: 'PARSE ERROR',
          itemTitle: 'Unable to parse checklist data',
          condition: null,
          conditionText: 'Not Rated',
          required: false,
          itemNotes: `Parse error: ${parseError.message}`,
          generalNotes: woPM.notes ? `${woPM.notes}\n\n[WARNING: Checklist data could not be parsed]` : '[WARNING: Checklist data could not be parsed]',
        });
      }

      for (const item of checklistItems) {
        pmRows.push({
          workOrderId: truncateId(wo.id),
          workOrderTitle: wo.title,
          equipmentName: equipment?.name || '',
          pmStatus: woPM.status?.replace(/_/g, ' ').toUpperCase() || '',
          completedDate: formatDateTime(woPM.completed_at),
          section: item.section,
          itemTitle: item.title,
          condition: item.condition,
          conditionText: getConditionText(item.condition),
          required: item.required,
          itemNotes: item.notes || '',
          generalNotes: woPM.notes || '',
        });
      }
    }

    // Timeline rows
    for (const event of woHistory) {
      const profiles = event.profiles as { name: string } | null;
      timelineRows.push({
        workOrderId: truncateId(wo.id),
        workOrderTitle: wo.title,
        previousStatus: event.old_status?.replace(/_/g, ' ').toUpperCase() || 'CREATED',
        newStatus: event.new_status.replace(/_/g, ' ').toUpperCase(),
        changedAt: formatDateTime(event.changed_at),
        changedBy: profiles?.name || 'System',
        reason: event.reason || '',
      });
    }

    // Equipment aggregation
    if (equipment) {
      const existing = equipmentAggMap.get(equipment.id);
      if (existing) {
        existing.workOrderCount += 1;
        existing.totalLaborHours += totalLaborHours;
        existing.totalMaterialsCost += totalMaterialCost;
      } else {
        equipmentAggMap.set(equipment.id, {
          equipmentId: truncateId(equipment.id),
          name: equipment.name,
          customerName: equipment.customer_name || '',
          manufacturer: equipment.manufacturer || '',
          model: equipment.model || '',
          serialNumber: equipment.serial_number || '',
          location: equipment.location || '',
          status: equipment.status,
          workOrderCount: 1,
          totalLaborHours,
          totalMaterialsCost: totalMaterialCost,
        });
      }
    }
  }

  return {
    summaryRows,
    laborRows,
    costRows,
    pmRows,
    timelineRows,
    equipmentRows: Array.from(equipmentAggMap.values()),
  };
}

/**
 * Converts a summary row to an array of cell values for spreadsheet output.
 */
export function summaryRowToArray(row: WorkOrderSummaryRow): (string | number | null)[] {
  return [
    row.workOrderId, row.title, row.description, row.customerName, row.equipmentName,
    row.equipmentSerialNumber, row.equipmentLocation, row.status, row.priority,
    row.createdDate, row.dueDate, row.completedDate, row.daysOpen,
    row.totalLaborHours, row.totalMaterialCost, row.pmStatus, row.assignee, row.team,
  ];
}

export function laborRowToArray(row: LaborDetailRow): (string | number | boolean)[] {
  return [
    row.workOrderId, row.workOrderTitle, row.date, row.technician,
    row.hoursWorked, row.notes, row.hasPhotos ? 'Yes' : 'No', row.hasPhotos ? row.photoCount : '',
  ];
}

export function costRowToArray(row: MaterialCostRow): (string | number | boolean)[] {
  return [
    row.workOrderId, row.workOrderTitle, row.equipmentName, row.itemDescription,
    row.quantity, row.unitPrice, row.totalPrice, row.fromInventory ? 'Yes' : 'No',
    row.dateAdded, row.addedBy,
  ];
}

export function pmRowToArray(row: PMChecklistRow): (string | number | boolean | null)[] {
  return [
    row.workOrderId, row.workOrderTitle, row.equipmentName, row.pmStatus,
    row.completedDate, row.section, row.itemTitle, row.condition,
    row.conditionText, row.required ? 'Yes' : 'No', row.itemNotes, row.generalNotes,
  ];
}

export function timelineRowToArray(row: TimelineRow): string[] {
  return [
    row.workOrderId, row.workOrderTitle, row.previousStatus, row.newStatus,
    row.changedAt, row.changedBy, row.reason,
  ];
}

export function equipmentRowToArray(row: EquipmentRow): (string | number)[] {
  return [
    row.equipmentId, row.name, row.customerName, row.manufacturer, row.model, row.serialNumber,
    row.location, row.status, row.workOrderCount, row.totalLaborHours, row.totalMaterialsCost,
  ];
}
