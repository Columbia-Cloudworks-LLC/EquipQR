import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubmitTicketDialog from './SubmitTicketDialog';

const state = vi.hoisted(() => ({
  role: 'owner' as 'owner' | 'admin' | 'member',
  submit: vi.fn(),
  grant: vi.fn(),
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganizationSafe: () => ({
    organizationId: 'org-1',
    currentOrganization: { id: 'org-1', userRole: state.role },
  }),
}));

vi.mock('../hooks/useSubmitTicket', () => ({
  useSubmitTicket: () => ({ mutate: state.submit, isPending: false }),
}));

vi.mock('../utils/sessionDiagnostics', () => ({
  collectSessionDiagnostics: () => ({}),
}));

vi.mock('@/features/organization/hooks/useSupportAccess', () => ({
  DEFAULT_SUPPORT_ACCESS_HOURS: 72,
  grantSupportAccess: state.grant,
}));

function renderDialog() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<SubmitTicketDialog open onOpenChange={() => {}} />, { wrapper });
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Work orders fail' } });
  fireEvent.change(screen.getByLabelText('Description / Steps to Reproduce'), {
    target: { value: 'Saving a work order shows an error every time.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));
}

describe('SubmitTicketDialog support access', () => {
  beforeEach(() => {
    state.role = 'owner';
    state.submit.mockReset();
    state.grant.mockReset();
    state.submit.mockImplementation((_payload, opts: { onSuccess: (r: { ticketId: string }) => void }) =>
      opts.onSuccess({ ticketId: 'ticket-9' }),
    );
    state.grant.mockResolvedValue({ expiresAt: '2026-10-17T00:00:00Z', extended: false, operatorsNotified: true });
  });

  it('does not grant access unless the owner opts in', () => {
    renderDialog();
    fillAndSubmit();
    expect(state.submit).toHaveBeenCalledTimes(1);
    expect(state.grant).not.toHaveBeenCalled();
  });

  it('grants 72 hours tied to the ticket when the owner opts in', async () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText(/Let EquipQR Support access my organization for 72 hours/));
    fillAndSubmit();
    await waitFor(() =>
      expect(state.grant).toHaveBeenCalledWith({
        organizationId: 'org-1',
        durationHours: 72,
        source: 'bug_report',
        ticketRef: 'ticket-9',
      }),
    );
  });

  it('tells non-owners to ask their owner', () => {
    state.role = 'admin';
    renderDialog();
    expect(screen.getByText('Ask your organization owner to grant support access.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
