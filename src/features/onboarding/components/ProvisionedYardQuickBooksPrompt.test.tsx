import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  PROVISIONED_YARD_QBO_PROMPT_STORAGE_PREFIX,
  ProvisionedYardQuickBooksPrompt,
} from './ProvisionedYardQuickBooksPrompt';

const orgState = vi.hoisted(() => ({
  currentOrganization: {
    id: 'org-1',
    name: 'Acme Yard',
    userRole: 'owner' as 'owner' | 'admin' | 'member',
  },
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => orgState,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const claimState = vi.hoisted(() => ({
  role: 'owner' as string | null,
  calls: [] as Array<string | undefined>,
}));
vi.mock('@/features/onboarding/hooks/useProvisionedYardClaim', () => ({
  useProvisionedYardClaim: (organizationId: string | undefined) => {
    claimState.calls.push(organizationId);
    return {
      data: organizationId && claimState.role ? { id: 'claim-1', role: claimState.role, claimed_at: 'now' } : null,
    };
  },
}));

const accessState = vi.hoisted(() => ({ canManage: true }));
vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (organizationId?: string) => ({
    data: organizationId ? accessState.canManage : undefined,
  }),
}));

const qbo = vi.hoisted(() => ({
  configured: true,
  connected: false,
  generateQuickBooksAuthUrl: vi.fn(),
}));
vi.mock('@/services/quickbooks', () => ({
  isQuickBooksConfigured: () => qbo.configured,
  getConnectionStatus: async () => ({ isConnected: qbo.connected }),
  generateQuickBooksAuthUrl: qbo.generateQuickBooksAuthUrl,
}));

function renderPrompt() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ProvisionedYardQuickBooksPrompt />, { wrapper });
}

describe('ProvisionedYardQuickBooksPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    orgState.currentOrganization = { id: 'org-1', name: 'Acme Yard', userRole: 'owner' };
    claimState.role = 'owner';
    claimState.calls = [];
    accessState.canManage = true;
    qbo.configured = true;
    qbo.connected = false;
    qbo.generateQuickBooksAuthUrl.mockReset();
  });

  it('prompts the owner who claimed an unconnected provisioned yard', async () => {
    renderPrompt();

    expect(await screen.findByTestId('provisioned-yard-qbo-prompt')).toBeInTheDocument();
    expect(screen.getByText(/Acme Yard/)).toBeInTheDocument();
  });

  it('stays hidden once QuickBooks is connected', async () => {
    qbo.connected = true;
    renderPrompt();

    await waitFor(() => expect(claimState.calls).toContain('org-1'));
    expect(screen.queryByTestId('provisioned-yard-qbo-prompt')).not.toBeInTheDocument();
  });

  it('stays hidden for owners who did not claim a provisioned yard', async () => {
    claimState.role = null;
    renderPrompt();

    await waitFor(() => expect(claimState.calls).toContain('org-1'));
    expect(screen.queryByTestId('provisioned-yard-qbo-prompt')).not.toBeInTheDocument();
  });

  it('does not look up claims for non-owners or when QuickBooks is not configured', () => {
    orgState.currentOrganization = { id: 'org-1', name: 'Acme Yard', userRole: 'member' };
    renderPrompt();
    qbo.configured = false;
    orgState.currentOrganization = { id: 'org-1', name: 'Acme Yard', userRole: 'owner' };
    renderPrompt();

    expect(claimState.calls.every((id) => id === undefined)).toBe(true);
    expect(screen.queryByTestId('provisioned-yard-qbo-prompt')).not.toBeInTheDocument();
  });

  it('remembers "Not now" per organization', async () => {
    renderPrompt();
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));

    expect(screen.queryByTestId('provisioned-yard-qbo-prompt')).not.toBeInTheDocument();
    expect(localStorage.getItem(`${PROVISIONED_YARD_QBO_PROMPT_STORAGE_PREFIX}org-1`)).not.toBeNull();
  });

  it('starts the QuickBooks OAuth flow for this organization', async () => {
    qbo.generateQuickBooksAuthUrl.mockRejectedValue(new Error('boom'));
    renderPrompt();
    fireEvent.click(await screen.findByRole('button', { name: /Connect QuickBooks/ }));

    await waitFor(() =>
      expect(qbo.generateQuickBooksAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-1' }),
      ),
    );
  });
});
