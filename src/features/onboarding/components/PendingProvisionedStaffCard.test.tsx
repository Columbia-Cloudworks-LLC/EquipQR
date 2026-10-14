import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PendingProvisionedStaffCard } from './PendingProvisionedStaffCard';

const state = vi.hoisted(() => ({
  pending: [] as Array<{ id: string; email: string; role: string; created_at: string; last_claim_error: string | null }>,
  mutate: vi.fn(),
  calls: [] as Array<string | undefined>,
}));

vi.mock('@/features/onboarding/hooks/usePendingProvisionedStaff', () => ({
  usePendingProvisionedStaff: (organizationId: string | undefined) => {
    state.calls.push(organizationId);
    return { data: state.pending };
  },
  useRevokePendingProvisionedStaff: () => ({ mutate: state.mutate, isPending: false }),
}));

describe('PendingProvisionedStaffCard', () => {
  beforeEach(() => {
    state.pending = [];
    state.mutate.mockReset();
    state.calls = [];
  });

  it('renders nothing when nobody is waiting', () => {
    const { container } = render(<PendingProvisionedStaffCard organizationId="org-1" />);
    expect(container).toBeEmptyDOMElement();
    expect(state.calls).toContain('org-1');
  });

  it('lists pending people and revokes by id', () => {
    state.pending = [
      { id: 'pm-1', email: 'mike@acme.test', role: 'member', created_at: '2026-10-14', last_claim_error: null },
      { id: 'pm-2', email: 'lead@acme.test', role: 'admin', created_at: '2026-10-14', last_claim_error: 'boom' },
    ];
    render(<PendingProvisionedStaffCard organizationId="org-1" />);

    expect(screen.getByText('mike@acme.test')).toBeInTheDocument();
    expect(screen.getByText(/couldn't join: boom/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove lead@acme.test' }));
    expect(state.mutate).toHaveBeenCalledWith('pm-2');
  });
});
