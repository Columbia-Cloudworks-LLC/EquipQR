/**
 * Deno mirror of quick form field validation for the quick-form edge
 * function (#1184). The frontend keeps an equivalent copy in
 * src/features/quick-forms/types/quickForm.ts.
 */

import { normalizeTextValue } from "./operator-checklist-validation.ts";

export type QuickFormInputType = "text" | "textarea" | "number" | "date" | "checkbox";

export interface QuickFormField {
  id: string;
  label: string;
  inputType: QuickFormInputType;
  required?: boolean;
  helpText?: string;
}

export interface QuickFormData {
  fields: QuickFormField[];
  collectLocation?: boolean;
}

export interface QuickFormFieldValue {
  field_id: string;
  label: string;
  input_type: QuickFormInputType;
  value: string | number | boolean | null;
}

export interface QuickFormValidationResult {
  isComplete: boolean;
  errors: string[];
}

const INPUT_TYPES: QuickFormInputType[] = ["text", "textarea", "number", "date", "checkbox"];

export function parseQuickFormData(raw: unknown): QuickFormData {
  if (typeof raw !== "object" || raw === null) {
    return { fields: [] };
  }
  const obj = raw as Record<string, unknown>;
  const fields = Array.isArray(obj.fields)
    ? obj.fields.filter(
        (item): item is QuickFormField =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as QuickFormField).id === "string" &&
          typeof (item as QuickFormField).label === "string" &&
          INPUT_TYPES.includes((item as QuickFormField).inputType),
      )
    : [];
  return {
    fields,
    collectLocation: obj.collectLocation === true,
  };
}

function isValuePresent(value: unknown, inputType: QuickFormInputType): boolean {
  if (inputType === "checkbox") return typeof value === "boolean";
  if (inputType === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export function validateQuickFormValues(
  fields: QuickFormField[],
  values: Record<string, unknown>,
): QuickFormValidationResult {
  const errors: string[] = [];
  for (const field of fields) {
    // Match the admin editor + public page: fields are required unless
    // explicitly marked `required: false`.
    if (field.required !== false && !isValuePresent(values[field.id], field.inputType)) {
      errors.push(`"${field.label}" is required.`);
    }
  }
  return { isComplete: errors.length === 0, errors };
}

/** Normalize raw submitted values to the persisted field_values array shape. */
export function buildQuickFormFieldValues(
  fields: QuickFormField[],
  rawValues: Record<string, unknown>,
): QuickFormFieldValue[] {
  return fields.map((field) => {
    const raw = rawValues[field.id];
    let value: string | number | boolean | null = null;

    if (field.inputType === "checkbox" && typeof raw === "boolean") {
      value = raw;
    } else if (field.inputType === "number" && typeof raw === "number" && Number.isFinite(raw)) {
      value = raw;
    } else if (typeof raw === "string") {
      value = normalizeTextValue(raw, field.inputType === "textarea" ? 2000 : 500);
    }

    return {
      field_id: field.id,
      label: field.label,
      input_type: field.inputType,
      value,
    };
  });
}
