/**
 * Operator daily check-in template and submission field model (#1091).
 */

import { validateRequiredInputFields } from '@/features/public-forms/publicFormValidation';

export type OperatorFieldSource = 'operator_input' | 'client_context' | 'equipment_snapshot';

export type OperatorInputFieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox';

export type ClientContextKey = 'submitted_timestamp' | 'browser_timezone' | 'gps_location';

export type EquipmentSnapshotKey =
  | 'name'
  | 'serial_number'
  | 'manufacturer'
  | 'model'
  | 'status'
  | 'location'
  | 'assigned_team'
  | 'working_hours'
  | 'custom_attributes';

export interface OperatorChecklistTemplateItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  section: string;
}

export interface OperatorChecklistDataField {
  id: string;
  label: string;
  source: OperatorFieldSource;
  required?: boolean;
  helpText?: string;
  inputType?: OperatorInputFieldType;
  clientKey?: ClientContextKey;
  equipmentKey?: EquipmentSnapshotKey;
}

export interface OperatorChecklistTemplateData {
  checklistItems: OperatorChecklistTemplateItem[];
  dataFields: OperatorChecklistDataField[];
}

export interface OperatorChecklistAnswer {
  item_id: string;
  passed: boolean;
  notes?: string;
}

export interface CapturedFieldValue {
  field_id: string;
  label: string;
  source: OperatorFieldSource;
  value: string | number | boolean | null;
}

export interface OperatorChecklistValidationResult {
  isComplete: boolean;
  requiredItemCount: number;
  answeredRequiredCount: number;
  errors: string[];
}

export interface OperatorFieldValidationResult {
  isComplete: boolean;
  errors: string[];
}

export const EQUIPMENT_SNAPSHOT_FIELD_OPTIONS: { key: EquipmentSnapshotKey; label: string }[] = [
  { key: 'name', label: 'Equipment name' },
  { key: 'serial_number', label: 'Serial number' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'model', label: 'Model' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
  { key: 'assigned_team', label: 'Assigned team' },
  { key: 'working_hours', label: 'Working hours' },
  { key: 'custom_attributes', label: 'Custom attributes' },
];

export const CLIENT_CONTEXT_FIELD_OPTIONS: { key: ClientContextKey; label: string }[] = [
  { key: 'submitted_timestamp', label: 'Submission timestamp' },
  { key: 'browser_timezone', label: 'Browser timezone' },
  { key: 'gps_location', label: 'GPS location' },
];

export const OPERATOR_INPUT_TYPE_OPTIONS: { key: OperatorInputFieldType; label: string }[] = [
  { key: 'text', label: 'Short text' },
  { key: 'textarea', label: 'Long text' },
  { key: 'number', label: 'Number' },
  { key: 'date', label: 'Date' },
  { key: 'checkbox', label: 'Checkbox' },
];

export function createEmptyTemplateData(): OperatorChecklistTemplateData {
  return { checklistItems: [], dataFields: [] };
}

export function parseTemplateData(raw: unknown): OperatorChecklistTemplateData {
  if (Array.isArray(raw)) {
    return { checklistItems: parseChecklistItems(raw), dataFields: [] };
  }
  if (typeof raw !== 'object' || raw === null) {
    return createEmptyTemplateData();
  }
  const obj = raw as Record<string, unknown>;
  return {
    checklistItems: parseChecklistItems(obj.checklistItems),
    dataFields: parseDataFields(obj.dataFields),
  };
}

function parseChecklistItems(raw: unknown): OperatorChecklistTemplateItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OperatorChecklistTemplateItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as OperatorChecklistTemplateItem).id === 'string' &&
      typeof (item as OperatorChecklistTemplateItem).title === 'string' &&
      typeof (item as OperatorChecklistTemplateItem).section === 'string',
  );
}

function parseDataFields(raw: unknown): OperatorChecklistDataField[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OperatorChecklistDataField =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as OperatorChecklistDataField).id === 'string' &&
      typeof (item as OperatorChecklistDataField).label === 'string' &&
      typeof (item as OperatorChecklistDataField).source === 'string',
  );
}

export function validateOperatorChecklistAnswers(
  items: OperatorChecklistTemplateItem[],
  answers: OperatorChecklistAnswer[],
): OperatorChecklistValidationResult {
  const errors: string[] = [];
  const answerMap = new Map(answers.map((a) => [a.item_id, a]));
  const requiredItems = items.filter((i) => i.required);
  let answeredRequiredCount = 0;

  for (const item of requiredItems) {
    const answer = answerMap.get(item.id);
    if (!answer || typeof answer.passed !== 'boolean') {
      errors.push(`Required item "${item.title}" must be answered.`);
      continue;
    }
    answeredRequiredCount += 1;
  }

  for (const answer of answers) {
    const item = items.find((i) => i.id === answer.item_id);
    if (!item) {
      errors.push(`Unknown checklist item: ${answer.item_id}`);
    }
  }

  return {
    isComplete: errors.length === 0 && answeredRequiredCount === requiredItems.length,
    requiredItemCount: requiredItems.length,
    answeredRequiredCount,
    errors,
  };
}

export function validateOperatorInputFields(
  fields: OperatorChecklistDataField[],
  values: Record<string, unknown>,
): OperatorFieldValidationResult {
  const requiredFields = fields
    .filter((f) => f.source === 'operator_input' && f.required === true)
    .map((f) => ({ id: f.id, label: f.label, inputType: f.inputType ?? 'text' }));
  return validateRequiredInputFields(requiredFields, values);
}

export function formatCapturedFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
