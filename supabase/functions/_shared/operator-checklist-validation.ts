/**
 * Deno mirror of operator checklist validation for edge function.
 */

export type OperatorFieldSource = "operator_input" | "client_context" | "equipment_snapshot";
export type OperatorInputFieldType = "text" | "textarea" | "number" | "date" | "checkbox";
export type ClientContextKey = "submitted_timestamp" | "browser_timezone" | "gps_location";
export type EquipmentSnapshotKey =
  | "name"
  | "serial_number"
  | "manufacturer"
  | "model"
  | "status"
  | "location"
  | "assigned_team"
  | "working_hours"
  | "custom_attributes";

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

export function parseTemplateData(raw: unknown): OperatorChecklistTemplateData {
  if (Array.isArray(raw)) {
    return { checklistItems: parseTemplateItems(raw), dataFields: [] };
  }
  if (typeof raw !== "object" || raw === null) {
    return { checklistItems: [], dataFields: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    checklistItems: parseTemplateItems(obj.checklistItems),
    dataFields: parseDataFields(obj.dataFields),
  };
}

export function parseTemplateItems(raw: unknown): OperatorChecklistTemplateItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OperatorChecklistTemplateItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as OperatorChecklistTemplateItem).id === "string" &&
      typeof (item as OperatorChecklistTemplateItem).title === "string" &&
      typeof (item as OperatorChecklistTemplateItem).section === "string",
  );
}

function parseDataFields(raw: unknown): OperatorChecklistDataField[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OperatorChecklistDataField =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as OperatorChecklistDataField).id === "string" &&
      typeof (item as OperatorChecklistDataField).label === "string" &&
      typeof (item as OperatorChecklistDataField).source === "string",
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
    if (!answer || typeof answer.passed !== "boolean") {
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

/** Persist only template-known answers with normalized notes (last answer wins per item). */
export function sanitizeOperatorChecklistAnswers(
  items: OperatorChecklistTemplateItem[],
  answers: OperatorChecklistAnswer[],
): OperatorChecklistAnswer[] {
  const allowedIds = new Set(items.map((item) => item.id));
  const deduped = new Map<string, OperatorChecklistAnswer>();

  for (const answer of answers) {
    if (!allowedIds.has(answer.item_id)) continue;
    if (typeof answer.passed !== "boolean") continue;
    const notes = normalizeTextValue(answer.notes, 2000);
    deduped.set(answer.item_id, {
      item_id: answer.item_id,
      passed: answer.passed,
      ...(notes ? { notes } : {}),
    });
  }

  return [...deduped.values()];
}

function isOperatorValuePresent(value: unknown, inputType: OperatorInputFieldType): boolean {
  if (inputType === "checkbox") return typeof value === "boolean";
  if (inputType === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export function validateOperatorInputFields(
  fields: OperatorChecklistDataField[],
  values: Record<string, unknown>,
): OperatorFieldValidationResult {
  const errors: string[] = [];
  for (const field of fields.filter((f) => f.source === "operator_input")) {
    const inputType = field.inputType ?? "text";
    if (field.required && !isOperatorValuePresent(values[field.id], inputType)) {
      errors.push(`"${field.label}" is required.`);
    }
  }
  return { isComplete: errors.length === 0, errors };
}

export function normalizeTextValue(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function resolveEquipmentSnapshotValue(
  equipmentKey: EquipmentSnapshotKey,
  equipment: Record<string, unknown>,
): string | number | null {
  switch (equipmentKey) {
    case "name":
      return typeof equipment.name === "string" ? equipment.name : null;
    case "serial_number":
      return typeof equipment.serial_number === "string" ? equipment.serial_number : null;
    case "manufacturer":
      return typeof equipment.manufacturer === "string" ? equipment.manufacturer : null;
    case "model":
      return typeof equipment.model === "string" ? equipment.model : null;
    case "status":
      return typeof equipment.status === "string" ? equipment.status : null;
    case "location":
      return typeof equipment.location === "string" ? equipment.location : null;
    case "working_hours":
      return typeof equipment.working_hours === "number" ? equipment.working_hours : null;
    case "assigned_team": {
      const team = equipment.team as Record<string, unknown> | null;
      return team && typeof team.name === "string" ? team.name : null;
    }
    case "custom_attributes":
      return equipment.custom_attributes ? JSON.stringify(equipment.custom_attributes) : null;
    default:
      return null;
  }
}
