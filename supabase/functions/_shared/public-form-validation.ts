/**
 * Deno mirror of src/features/public-forms/publicFormValidation.ts: required-field
 * validation shared by the operator check-in and quick-form edge functions.
 * public-form-mirrors.vitest.test.ts fails when the two copies drift.
 */

export type PublicFormInputType = "text" | "textarea" | "number" | "date" | "checkbox";

export interface RequiredInputField {
  id: string;
  label: string;
  inputType: PublicFormInputType;
}

export interface PublicFormValidationResult {
  isComplete: boolean;
  errors: string[];
}

// Deno mirror of src/features/public-forms/publicFormValidation.ts (the browser bundle cannot import edge modules); public-form-mirrors.vitest.test.ts fails on drift.
// fallow-ignore-next-line code-duplication
export function isPublicInputValuePresent(
  value: unknown,
  inputType: PublicFormInputType,
): boolean {
  if (inputType === "checkbox") return typeof value === "boolean";
  if (inputType === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

/** Validate that every field in `requiredFields` has an answered value. */
export function validateRequiredInputFields(
  requiredFields: RequiredInputField[],
  values: Record<string, unknown>,
): PublicFormValidationResult {
  const errors: string[] = [];
  for (const field of requiredFields) {
    if (!isPublicInputValuePresent(values[field.id], field.inputType)) {
      errors.push(`"${field.label}" is required.`);
    }
  }
  return { isComplete: errors.length === 0, errors };
}
