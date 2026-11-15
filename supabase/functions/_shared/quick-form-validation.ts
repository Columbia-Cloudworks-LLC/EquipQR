/**
 * Deno mirror of quick form field validation for the quick-form edge
 * function (#1184). The frontend keeps an equivalent copy in
 * src/features/quick-forms/types/quickForm.ts.
 */

import { normalizeTextValue } from "./operator-checklist-validation.ts";
import { validateRequiredInputFields } from "./public-form-validation.ts";

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
  // Deno mirror of src/features/quick-forms/types/quickForm.ts (the browser bundle cannot import edge modules); public-form-mirrors.vitest.test.ts fails on drift.
  // fallow-ignore-next-line code-duplication
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

/** Strict gate for persisted snapshots — rejects non-objects and missing fields arrays. */
export function assertQuickFormSnapshot(raw: unknown): QuickFormData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid quick form snapshot");
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.fields)) {
    throw new Error("Invalid quick form snapshot");
  }
  const parsed = parseQuickFormData(raw);
  if (parsed.fields.length !== obj.fields.length) {
    throw new Error("Invalid quick form snapshot");
  }
  return parsed;
}

/**
 * Fields default to required unless explicitly marked `required: false`
 * (matching the admin editor default and the public page's `*` markers).
 */
export function validateQuickFormValues(
  fields: QuickFormField[],
  values: Record<string, unknown>,
): QuickFormValidationResult {
  // Deno mirror of src/features/quick-forms/types/quickForm.ts (the browser bundle cannot import edge modules); public-form-mirrors.vitest.test.ts fails on drift.
  // fallow-ignore-next-line code-duplication
  const requiredFields = fields
    .filter((field) => field.required !== false)
    .map((field) => ({ id: field.id, label: field.label, inputType: field.inputType }));
  return validateRequiredInputFields(requiredFields, values);
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
