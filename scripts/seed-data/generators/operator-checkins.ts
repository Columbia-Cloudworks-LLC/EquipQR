/**
 * Operator daily check-in generator: one Metro checklist template, QR
 * assignments on generated Metro equipment, and a scaled ledger of
 * submissions (mostly passing, some with failed items).
 *
 * Scoped to Metro Equipment: the Apex operator check-in surface must stay
 * empty at seed time because the daily-operator-check-in PR-evidence spec
 * resets and rebuilds Apex data from a clean slate.
 */

import { createHash } from 'node:crypto';
import { SeededRng } from '../rng';
import { ORGS, UUID_PREFIXES } from '../reference-data';
import { deterministicUuid, escapeSql, jsonbLiteral, renderSeedFile, uuidLiteral } from '../sql-builder';
import type { GeneratedEquipment } from './equipment';

const BASE_SUBMISSIONS_PER_ASSIGNMENT = 6;
const ASSIGNMENT_COUNT = 2;

const OPERATOR_NAMES = ['Jordan Diaz', 'Casey Nguyen', 'Riley Brooks', 'Sam Patel', 'Alexis Romero', 'Drew Kowalski'];

const CHECKLIST_ITEMS = [
  { id: 'seed-item-01', title: 'Service brakes operate correctly', section: 'Safety', required: true },
  { id: 'seed-item-02', title: 'Parking brake holds on incline', section: 'Safety', required: true },
  { id: 'seed-item-03', title: 'Horn and backup alarm working', section: 'Safety', required: true },
  { id: 'seed-item-04', title: 'Seat belt latches securely', section: 'Safety', required: true },
  { id: 'seed-item-05', title: 'Tires free of damage and properly inflated', section: 'Walkaround', required: true },
  { id: 'seed-item-06', title: 'No visible fluid leaks', section: 'Walkaround', required: true },
  { id: 'seed-item-07', title: 'Forks/attachments free of cracks', section: 'Walkaround', required: false },
  { id: 'seed-item-08', title: 'Cab glass and mirrors clean', section: 'Walkaround', required: false },
];

const DATA_FIELDS = [
  {
    id: 'seed-field-operator',
    label: 'Driver / Operator name',
    source: 'operator_input',
    required: true,
    inputType: 'text',
  },
  {
    id: 'seed-field-hours',
    label: 'Hour meter reading',
    source: 'operator_input',
    required: true,
    inputType: 'number',
  },
  {
    id: 'seed-field-timestamp',
    label: 'Submission timestamp',
    source: 'client_context',
    clientKey: 'submitted_timestamp',
  },
  {
    id: 'seed-field-equipment-name',
    label: 'Equipment name',
    source: 'equipment_snapshot',
    equipmentKey: 'name',
  },
];

export interface OperatorCheckinDomainResult {
  sql: string;
  summary: { templates: number; assignments: number; submissions: number };
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Deterministic 64-hex "raw token" (same shape the RPC mints via gen_random_bytes). */
function seedToken(index: number): string {
  return sha256Hex(`equipqr-local-seed-operator-checkin-token-${index}`);
}

export function generateOperatorCheckinDomain(
  scale: number,
  equipment: GeneratedEquipment[],
): OperatorCheckinDomainResult {
  const rng = new SeededRng(42345);
  const org = ORGS.metro;
  const admin = org.staff[0];
  const metroEquipment = equipment.filter((eq) => eq.orgKey === 'metro' && eq.status === 'active');
  const targets = metroEquipment.slice(0, ASSIGNMENT_COUNT);

  const templateId = deterministicUuid(UUID_PREFIXES.operatorTemplate, 100);
  const templateData = { checklistItems: CHECKLIST_ITEMS, dataFields: DATA_FIELDS };
  const requiredCount = CHECKLIST_ITEMS.filter((item) => item.required).length;

  const templateRows = [
    [
      uuidLiteral(templateId),
      uuidLiteral(org.id),
      escapeSql('Daily Equipment Walkaround'),
      escapeSql('Pre-shift walkaround and safety check for rental fleet equipment.'),
      jsonbLiteral(templateData),
      'true',
      uuidLiteral(admin.id),
      uuidLiteral(admin.id),
      `NOW() - INTERVAL '60 days'`,
      `NOW() - INTERVAL '60 days'`,
    ].join(', '),
  ];

  const settingRows: string[] = [];
  const secretRows: string[] = [];
  const submissionRows: string[] = [];
  let submissionCounter = 100;

  targets.forEach((eq, index) => {
    const settingsId = deterministicUuid(UUID_PREFIXES.operatorSetting, 100 + index);
    const rawToken = seedToken(100 + index);

    settingRows.push(
      [
        uuidLiteral(settingsId),
        uuidLiteral(org.id),
        uuidLiteral(eq.id),
        uuidLiteral(templateId),
        'true',
        escapeSql(sha256Hex(rawToken)),
        `NOW() - INTERVAL '45 days'`,
        uuidLiteral(admin.id),
        `NOW() - INTERVAL '45 days'`,
        `NOW() - INTERVAL '45 days'`,
      ].join(', '),
    );
    secretRows.push(
      [uuidLiteral(settingsId), uuidLiteral(org.id), escapeSql(rawToken), `NOW() - INTERVAL '45 days'`].join(', '),
    );

    const submissionCount = BASE_SUBMISSIONS_PER_ASSIGNMENT * scale;
    for (let s = 0; s < submissionCount; s++) {
      const daysAgo = Math.max(0, Math.floor((s * 14) / submissionCount));
      const operator = rng.choice(OPERATOR_NAMES);
      const hourMeter = rng.int(200, 5800);
      // ~12% of submissions record one failed non-required-to-pass item.
      const failedItemId = rng.next() < 0.12 ? rng.choice(CHECKLIST_ITEMS).id : null;

      const answers = CHECKLIST_ITEMS.map((item) => ({
        item_id: item.id,
        passed: item.id !== failedItemId,
        ...(item.id === failedItemId ? { notes: 'Flagged during walkaround - needs follow-up.' } : {}),
      }));

      const operatorFieldValues = [
        { field_id: 'seed-field-operator', label: 'Driver / Operator name', source: 'operator_input', value: operator },
        { field_id: 'seed-field-hours', label: 'Hour meter reading', source: 'operator_input', value: hourMeter },
      ];
      const clientFieldValues = [
        {
          field_id: 'seed-field-timestamp',
          label: 'Submission timestamp',
          source: 'client_context',
          value: `seeded ${daysAgo} day(s) ago`,
        },
      ];
      const equipmentFieldValues = [
        { field_id: 'seed-field-equipment-name', label: 'Equipment name', source: 'equipment_snapshot', value: eq.name },
      ];
      const templateSnapshot = {
        template_id: templateId,
        name: 'Daily Equipment Walkaround',
        description: 'Pre-shift walkaround and safety check for rental fleet equipment.',
        ...templateData,
      };

      submissionRows.push(
        [
          uuidLiteral(deterministicUuid(UUID_PREFIXES.operatorSubmission, submissionCounter++)),
          uuidLiteral(org.id),
          uuidLiteral(eq.id),
          uuidLiteral(templateId),
          uuidLiteral(settingsId),
          jsonbLiteral(operatorFieldValues),
          jsonbLiteral(clientFieldValues),
          jsonbLiteral(equipmentFieldValues),
          jsonbLiteral(answers),
          jsonbLiteral(templateSnapshot),
          'true',
          String(requiredCount),
          String(requiredCount),
          `NOW() - INTERVAL '${daysAgo} days' + INTERVAL '${rng.int(6, 9)} hours'`,
          `NOW() - INTERVAL '${daysAgo} days' + INTERVAL '${rng.int(6, 9)} hours'`,
        ].join(', '),
      );
    }
  });

  const sql = renderSeedFile({
    fileTitle: 'Generated Seed Data - Operator Daily Check-Ins (Metro)',
    descriptionLines: [
      `Scale: ${scale} (1 template, ${settingRows.length} assignments, ${submissionRows.length} submissions)`,
      'Apex is intentionally left empty for the daily-operator-check-in evidence spec.',
    ],
    sections: [
      {
        title: 'OPERATOR CHECKLIST TEMPLATES',
        insert: {
          table: 'public.operator_checklist_templates',
          columns: [
            'id', 'organization_id', 'name', 'description', 'template_data',
            'is_active', 'created_by', 'updated_by', 'created_at', 'updated_at',
          ],
          rows: templateRows,
        },
      },
      {
        title: 'EQUIPMENT CHECK-IN ASSIGNMENTS',
        insert: {
          table: 'public.equipment_operator_checkin_settings',
          columns: [
            'id', 'organization_id', 'equipment_id', 'template_id', 'enabled',
            'public_token_hash', 'token_rotated_at', 'token_rotated_by', 'created_at', 'updated_at',
          ],
          rows: settingRows,
        },
      },
      {
        title: 'CHECK-IN TOKEN SECRETS (local dev only)',
        insert: {
          table: 'public.operator_checkin_token_secrets',
          columns: ['settings_id', 'organization_id', 'raw_token', 'created_at'],
          rows: secretRows,
          conflictClause: 'ON CONFLICT (settings_id) DO NOTHING',
        },
      },
      {
        title: 'CHECK-IN SUBMISSIONS',
        insert: {
          table: 'public.operator_checkin_submissions',
          columns: [
            'id', 'organization_id', 'equipment_id', 'template_id', 'settings_id',
            'operator_field_values', 'client_field_values', 'equipment_field_values',
            'checklist_answers', 'template_snapshot', 'is_complete',
            'required_item_count', 'answered_required_count', 'submitted_at', 'created_at',
          ],
          rows: submissionRows,
        },
      },
    ],
  });

  return {
    sql,
    summary: { templates: 1, assignments: settingRows.length, submissions: submissionRows.length },
  };
}
