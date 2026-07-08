import { describe, it, expect } from 'vitest';
import {
  formatQuickFormValue,
  parseQuickFormData,
  validateQuickFormValues,
  type QuickFormField,
} from '@/features/quick-forms/types/quickForm';

const fields: QuickFormField[] = [
  { id: 'name', label: 'Employee name', inputType: 'text', required: true },
  { id: 'hours', label: 'Hours on site', inputType: 'number', required: true },
  { id: 'ppe', label: 'PPE worn', inputType: 'checkbox', required: true },
  { id: 'notes', label: 'Notes', inputType: 'textarea', required: false },
];

describe('parseQuickFormData', () => {
  it('parses well-formed form data', () => {
    const parsed = parseQuickFormData({ fields, collectLocation: true });
    expect(parsed.fields).toHaveLength(4);
    expect(parsed.collectLocation).toBe(true);
  });

  it('drops malformed field entries and unknown input types', () => {
    const parsed = parseQuickFormData({
      fields: [
        fields[0],
        { id: 'bad', label: 'Bad', inputType: 'select' },
        { label: 'No id', inputType: 'text' },
        'not-an-object',
      ],
    });
    expect(parsed.fields).toHaveLength(1);
    expect(parsed.fields[0].id).toBe('name');
    expect(parsed.collectLocation).toBe(false);
  });

  it('returns empty fields for null / non-object input', () => {
    expect(parseQuickFormData(null).fields).toEqual([]);
    expect(parseQuickFormData('nope').fields).toEqual([]);
  });
});

describe('validateQuickFormValues', () => {
  it('passes when all required fields are present', () => {
    const result = validateQuickFormValues(fields, {
      name: 'Sam',
      hours: 8,
      ppe: true,
    });
    expect(result.isComplete).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags missing required fields (empty string, missing number, unset checkbox)', () => {
    const result = validateQuickFormValues(fields, { name: '  ', ppe: undefined });
    expect(result.isComplete).toBe(false);
    expect(result.errors).toEqual([
      '"Employee name" is required.',
      '"Hours on site" is required.',
      '"PPE worn" is required.',
    ]);
  });

  it('accepts checkbox false as an answered value', () => {
    const result = validateQuickFormValues(fields, { name: 'Sam', hours: 4, ppe: false });
    expect(result.isComplete).toBe(true);
  });

  it('ignores optional fields', () => {
    const result = validateQuickFormValues(fields, { name: 'Sam', hours: 1, ppe: true, notes: '' });
    expect(result.isComplete).toBe(true);
  });
});

describe('formatQuickFormValue', () => {
  it('formats booleans, nulls, and scalars', () => {
    expect(formatQuickFormValue(true)).toBe('Yes');
    expect(formatQuickFormValue(false)).toBe('No');
    expect(formatQuickFormValue(null)).toBe('—');
    expect(formatQuickFormValue('')).toBe('—');
    expect(formatQuickFormValue(42)).toBe('42');
    expect(formatQuickFormValue('hello')).toBe('hello');
  });
});
