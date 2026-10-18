import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SupportAccessBanner } from './SupportAccessBanner';

const state = vi.hoisted(() => ({
  role: 'owner' as 'owner' | 'admin' | 'member',
  grant: null as null | { expires_at: string },
  revoke: vi.fn(),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', userRole: state.role } }),
}));

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({ formatDateTime: () => 'Thu, Oct 17, 9:00 AM' }),
}));

vi.mock('@/features/organization/hooks/useSupportAccess', () => ({
  useSupportAccessStatus: () => ({ data: state.grant }),
  useRevokeSupportAccess: () => ({ mutate: state.revoke, isPending: false }),
}));

describe('SupportAccessBanner', () => {
  beforeEach(() => {
    state.role = 'owner';
    state.grant = null;
    state.revoke.mockReset();
  });

  it('renders nothing without a live grant', () => {
    const { container } = render(<SupportAccessBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the expiry and lets the owner revoke', () => {
    state.grant = { expires_at: '2026-10-17T14:00:00Z' };
    render(<SupportAccessBanner />);
    expect(screen.getByText(/until Thu, Oct 17, 9:00 AM/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(state.revoke).toHaveBeenCalledTimes(1);
  });

  it('shows the banner without Revoke to other members', () => {
    state.role = 'member';
    state.grant = { expires_at: '2026-10-17T14:00:00Z' };
    render(<SupportAccessBanner />);
    expect(screen.getByTestId('support-access-banner')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});
