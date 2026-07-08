/**
 * Quick Forms (#1184) — standalone public data-collection forms.
 * Canonical field/schema types shared by the admin editor, the public form
 * page, and the ledger. The edge function keeps a Deno mirror in
 * supabase/functions/_shared/quick-form-validation.ts.
 */

import { validateRequiredInputFields } from '@/features/public-forms/publicFormValidation';

export type QuickFormInputType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox';

export const QUICK_FORM_INPUT_TYPES: { value: QuickFormInputType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

export interface QuickFormField {
  id: string;
  label: string;
  inputType: QuickFormInputType;
  required?: boolean;
  helpText?: string;
}

export interface QuickFormData {
  fields: QuickFormField[];
  /** Ask the submitter's browser for GPS coordinates (optional consent). */
  collectLocation?: boolean;
}

export interface QuickFormFieldValue {
  field_id: string;
  label: string;
  input_type: QuickFormInputType;
  value: string | number | boolean | null;
}

export interface QuickFormClientContext {
  submitted_timestamp?: string | null;
  browser_timezone?: string | null;
  gps?: { latitude: number; longitude: number } | null;
}

const INPUT_TYPES: QuickFormInputType[] = ['text', 'textarea', 'number', 'date', 'checkbox'];

export function parseQuickFormData(raw: unknown): QuickFormData {
  if (typeof raw !== 'object' || raw === null) {
    return { fields: [] };
  }
  const obj = raw as Record<string, unknown>;
  const fields = Array.isArray(obj.fields)
    ? obj.fields.filter(
        (item): item is QuickFormField =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as QuickFormField).id === 'string' &&
          typeof (item as QuickFormField).label === 'string' &&
          INPUT_TYPES.includes((item as QuickFormField).inputType),
      )
    : [];
  return {
    fields,
    collectLocation: obj.collectLocation === true,
  };
}

/**
 * Fields default to required unless explicitly marked `required: false`
 * (matching the admin editor default and the public page's `*` markers).
 */
export function validateQuickFormValues(
  fields: QuickFormField[],
  values: Record<string, unknown>,
): { isComplete: boolean; errors: string[] } {
  const requiredFields = fields
    .filter((field) => field.required !== false)
    .map((field) => ({ id: field.id, label: field.label, inputType: field.inputType }));
  return validateRequiredInputFields(requiredFields, values);
}

export function createQuickFormFieldId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `field-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatQuickFormValue(value: QuickFormFieldValue['value']): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
