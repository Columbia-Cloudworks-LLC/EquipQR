import { describe, expect, it } from 'vitest';
import {
  buildCreationDescription,
  getCreationTitle,
  getStatusChangeTitle,
} from '@/features/work-orders/utils/workOrderTimelineLabels';

describe('workOrderTimelineLabels', () => {
  it('uses a combined title only when an assignee is present at creation', () => {
    expect(getCreationTitle('assigned', true)).toBe('Work Order Created & Assigned');
    expect(getCreationTitle('assigned', false)).toBe('Work Order Created');
    expect(getStatusChangeTitle('submitted', 'assigned')).toBe('Work Assigned');
  });

  it('builds a creation description with submitter and assignee', () => {
    expect(
      buildCreationDescription({
        status: 'assigned',
        createdByName: 'Nicholas King',
        assigneeName: 'Nicholas King',
      }),
    ).toBe('Submitted by Nicholas King • Assigned to Nicholas King');
  });

  it('uses distinct titles for non-creation status changes', () => {
    expect(getStatusChangeTitle(null, 'submitted')).toBe('Work Order Created');
    expect(getStatusChangeTitle('assigned', 'in_progress')).toBe('Work Started');
    expect(getStatusChangeTitle('in_progress', 'completed')).toBe('Work Completed');
  });
});
