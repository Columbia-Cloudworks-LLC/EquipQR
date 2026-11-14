/**
 * Drift guard for the public-form validation that exists twice because the
 * browser bundle cannot import Deno modules:
 *
 *   src/features/public-forms/publicFormValidation.ts   ↔ ./public-form-validation.ts
 *   src/features/operator-check-ins/types/operatorChecklist.ts ↔ ./operator-checklist-validation.ts
 *   src/features/quick-forms/types/quickForm.ts         ↔ ./quick-form-validation.ts
 *
 * Runtime cases compare both implementations on the same inputs; the
 * expectTypeOf assertions are enforced by `npm run type-check`
 * (this file is listed in tsconfig.node.json).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as clientPublic from '@/features/public-forms/publicFormValidation';
import * as clientOperator from '@/features/operator-check-ins/types/operatorChecklist';
import * as clientQuick from '@/features/quick-forms/types/quickForm';
import * as edgePublic from './public-form-validation.ts';
import * as edgeOperator from './operator-checklist-validation.ts';
import * as edgeQuick from './quick-form-validation.ts';

const INPUT_TYPES = ['text', 'textarea', 'number', 'date', 'checkbox'] as const;
const SAMPLE_VALUES: unknown[] = [
  undefined, null, '', '   ', 'ok', 0, 42, Number.NaN, Number.POSITIVE_INFINITY,
  true, false, {}, [], '2026-01-01',
];

const TEMPLATE_INPUTS: unknown[] = [
  null,
  undefined,
  'not-an-object',
  42,
  [],
  [{ id: 'a', title: 'Tires', section: 'Walkaround', required: true }, { id: 1, title: 'bad' }],
  {},
  {
    checklistItems: [
      { id: 'a', title: 'Tires', section: 'Walkaround', required: true },
      { id: 'b', title: 'Horn', section: 'Cab' },
      { id: 'c', title: 7, section: 'Cab' },
      null,
    ],
    dataFields: [
      { id: 'f1', label: 'Hours', source: 'operator_input', inputType: 'number', required: true },
      { id: 'f2', label: 'Notes', source: 'operator_input', required: true },
      { id: 'f3', label: 'Optional', source: 'operator_input', inputType: 'text' },
      { id: 'f4', label: 'Serial', source: 'equipment_snapshot', equipmentKey: 'serial_number', required: true },
      { id: 'f5', label: 'Missing source' },
    ],
  },
  { checklistItems: 'nope', dataFields: null },
];

const QUICK_FORM_INPUTS: unknown[] = [
  null,
  'x',
  [],
  {},
  { fields: 'nope' },
  {
    fields: [
      { id: 'q1', label: 'Name', inputType: 'text' },
      { id: 'q2', label: 'Count', inputType: 'number', required: true },
      { id: 'q3', label: 'Agree', inputType: 'checkbox', required: false },
      { id: 'q4', label: 'Bad type', inputType: 'select' },
      { id: 5, label: 'Bad id', inputType: 'text' },
    ],
    collectLocation: true,
  },
  { fields: [], collectLocation: 'yes' },
];

const VALUE_SETS: Record<string, unknown>[] = [
  {},
  { f1: 3, f2: 'hello', q1: 'Ada', q2: 0, q3: false },
  { f1: '3', f2: '   ', q1: '', q2: Number.NaN, q3: 'true' },
  { f1: null, f2: null, q1: null, q2: null },
];

describe('public form validation mirrors (client ↔ edge)', () => {
  it('isPublicInputValuePresent agrees for every input type and value', () => {
    for (const inputType of INPUT_TYPES) {
      for (const value of SAMPLE_VALUES) {
        expect(edgePublic.isPublicInputValuePresent(value, inputType), `${inputType} / ${String(value)}`)
          .toBe(clientPublic.isPublicInputValuePresent(value, inputType));
      }
    }
  });

  it('validateRequiredInputFields agrees', () => {
    const fields = INPUT_TYPES.map((inputType, index) => ({ id: `r${index}`, label: `Field ${index}`, inputType }));
    for (const value of SAMPLE_VALUES) {
      const values = Object.fromEntries(fields.map((field) => [field.id, value]));
      expect(edgePublic.validateRequiredInputFields(fields, values))
        .toEqual(clientPublic.validateRequiredInputFields(fields, values));
    }
  });

  it('operator checklist parsing and validation agree', () => {
    for (const raw of TEMPLATE_INPUTS) {
      const clientTemplate = clientOperator.parseTemplateData(raw);
      const edgeTemplate = edgeOperator.parseTemplateData(raw);
      expect(edgeTemplate).toEqual(clientTemplate);

      const answerSets = [
        [],
        [{ item_id: 'a', passed: true }],
        [{ item_id: 'a', passed: false }, { item_id: 'b', passed: true }, { item_id: 'zzz', passed: true }],
        [{ item_id: 'a', passed: 'yes' }],
      ] as clientOperator.OperatorChecklistAnswer[][];
      for (const answers of answerSets) {
        expect(edgeOperator.validateOperatorChecklistAnswers(edgeTemplate.checklistItems, answers))
          .toEqual(clientOperator.validateOperatorChecklistAnswers(clientTemplate.checklistItems, answers));
      }
      for (const values of VALUE_SETS) {
        expect(edgeOperator.validateOperatorInputFields(edgeTemplate.dataFields, values))
          .toEqual(clientOperator.validateOperatorInputFields(clientTemplate.dataFields, values));
      }
    }
  });

  it('quick form parsing and validation agree', () => {
    for (const raw of QUICK_FORM_INPUTS) {
      const clientForm = clientQuick.parseQuickFormData(raw);
      const edgeForm = edgeQuick.parseQuickFormData(raw);
      expect(edgeForm).toEqual(clientForm);
      for (const values of VALUE_SETS) {
        expect(edgeQuick.validateQuickFormValues(edgeForm.fields, values))
          .toEqual(clientQuick.validateQuickFormValues(clientForm.fields, values));
      }
    }
  });

  it('mirrored types stay identical', () => {
    expectTypeOf<edgePublic.PublicFormInputType>().toEqualTypeOf<clientPublic.PublicFormInputType>();
    expectTypeOf<edgePublic.RequiredInputField>().toEqualTypeOf<clientPublic.RequiredInputField>();
    expectTypeOf<edgePublic.PublicFormValidationResult>().toEqualTypeOf<clientPublic.PublicFormValidationResult>();

    expectTypeOf<edgeOperator.OperatorFieldSource>().toEqualTypeOf<clientOperator.OperatorFieldSource>();
    expectTypeOf<edgeOperator.OperatorInputFieldType>().toEqualTypeOf<clientOperator.OperatorInputFieldType>();
    expectTypeOf<edgeOperator.ClientContextKey>().toEqualTypeOf<clientOperator.ClientContextKey>();
    expectTypeOf<edgeOperator.EquipmentSnapshotKey>().toEqualTypeOf<clientOperator.EquipmentSnapshotKey>();
    expectTypeOf<edgeOperator.OperatorChecklistTemplateItem>().toEqualTypeOf<clientOperator.OperatorChecklistTemplateItem>();
    expectTypeOf<edgeOperator.OperatorChecklistDataField>().toEqualTypeOf<clientOperator.OperatorChecklistDataField>();
    expectTypeOf<edgeOperator.OperatorChecklistTemplateData>().toEqualTypeOf<clientOperator.OperatorChecklistTemplateData>();
    expectTypeOf<edgeOperator.OperatorChecklistAnswer>().toEqualTypeOf<clientOperator.OperatorChecklistAnswer>();
    expectTypeOf<edgeOperator.CapturedFieldValue>().toEqualTypeOf<clientOperator.CapturedFieldValue>();
    expectTypeOf<edgeOperator.OperatorChecklistValidationResult>().toEqualTypeOf<clientOperator.OperatorChecklistValidationResult>();
    expectTypeOf<edgeOperator.OperatorFieldValidationResult>().toEqualTypeOf<clientOperator.OperatorFieldValidationResult>();

    expectTypeOf<edgeQuick.QuickFormInputType>().toEqualTypeOf<clientQuick.QuickFormInputType>();
    expectTypeOf<edgeQuick.QuickFormField>().toEqualTypeOf<clientQuick.QuickFormField>();
    expectTypeOf<edgeQuick.QuickFormData>().toEqualTypeOf<clientQuick.QuickFormData>();
    expectTypeOf<edgeQuick.QuickFormFieldValue>().toEqualTypeOf<clientQuick.QuickFormFieldValue>();
  });
});
