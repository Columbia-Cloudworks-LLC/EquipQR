import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { InlineEditWorkOrderAssignee } from './InlineEditWorkOrderAssignee';

vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: () => ({
    assignmentOptions: [{ id: 'user-2', name: 'Alex Tech' }],
    isLoading: false,
    equipmentHasNoTeam: false,
  }),
}));

const mutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useQuickWorkOrderAssignment', () => ({
  useQuickWorkOrderAssignment: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

describe('InlineEditWorkOrderAssignee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders assignee and opens inline editor', async () => {
    const user = userEvent.setup();

    render(
      <InlineEditWorkOrderAssignee
        workOrder={{
          id: 'wo-1',
          organization_id: 'org-1',
          equipment_id: 'eq-1',
          equipmentTeamId: 'team-1',
          assignee_id: 'user-1',
          assigneeName: 'Matt Technician',
          status: 'in_progress',
        }}
        organizationId="org-1"
        canEdit
      />,
    );

    expect(screen.getByText(/assigned to/i)).toBeInTheDocument();
    expect(screen.getByText('Matt Technician')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit assignee/i }));

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
