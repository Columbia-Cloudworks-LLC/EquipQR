import { describe, it, expect } from 'vitest';
import { getSubmissionTemplateName } from '@/features/operator-check-ins/utils/submissionTemplateHelpers';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';

function makeSubmission(snapshot: Record<string, unknown>): OperatorCheckinSubmission {
  return {
    id: 'sub-1',
    organization_id: 'org-1',
    equipment_id: 'eq-1',
    template_id: 'tpl-1',
    settings_id: 'set-1',
    submitted_at: '2026-07-03T12:00:00.000Z',
    template_snapshot: snapshot,
    operator_field_values: [],
    client_field_values: [],
    equipment_field_values: [],
    checklist_answers: [],
    is_complete: true,
    required_item_count: 0,
    answered_required_count: 0,
  };
}

describe('getSubmissionTemplateName', () => {
  it('returns template name from snapshot', () => {
    expect(getSubmissionTemplateName(makeSubmission({ name: 'Odometer Log' }))).toBe('Odometer Log');
  });

  it('returns null when snapshot has no name', () => {
    expect(getSubmissionTemplateName(makeSubmission({ checklistItems: [] }))).toBeNull();
  });
});
