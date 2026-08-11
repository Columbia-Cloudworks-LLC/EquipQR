import { describe, expect, it } from 'vitest';
import {
  parseTemplateData,
  validateOperatorChecklistAnswers,
  validateOperatorInputFields,
} from '@/features/operator-check-ins/types/operatorChecklist';

describe('operatorChecklist validation', () => {
  it('parses legacy array template data into checklist items', () => {
    const parsed = parseTemplateData([
      { id: 'a', title: 'Brakes', required: true, section: 'Safety' },
    ]);
    expect(parsed.checklistItems).toHaveLength(1);
    expect(parsed.dataFields).toHaveLength(0);
  });

  it('requires answers for required checklist items', () => {
    const items = [{ id: 'a', title: 'Brakes', required: true, section: 'Safety' }];
    const result = validateOperatorChecklistAnswers(items, []);
    expect(result.isComplete).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes when required checklist items are answered', () => {
    const items = [{ id: 'a', title: 'Brakes', required: true, section: 'Safety' }];
    const result = validateOperatorChecklistAnswers(items, [{ item_id: 'a', passed: true }]);
    expect(result.isComplete).toBe(true);
  });

  it('requires configured operator input fields', () => {
    const fields = [{
      id: 'name',
      label: 'Your name',
      source: 'operator_input' as const,
      inputType: 'text' as const,
      required: true,
    }];
    const missing = validateOperatorInputFields(fields, {});
    expect(missing.isComplete).toBe(false);

    const complete = validateOperatorInputFields(fields, { name: 'Jane Doe' });
    expect(complete.isComplete).toBe(true);
  });
});
