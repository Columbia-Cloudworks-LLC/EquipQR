import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SupportAccessCard } from './SupportAccessCard';

const state = vi.hoisted(() => ({
  grant: null as null | { expires_at: string },
  grantMutate: vi.fn(),
  revokeMutate: vi.fn(),
}));

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({ formatDateTime: () => 'Thu, Oct 17, 9:00 AM' }),
}));

vi.mock('@/features/organization/hooks/useSupportAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/organization/hooks/useSupportAccess')>();
  return {
    ...actual,
    useSupportAccessStatus: () => ({ data: state.grant }),
    useGrantSupportAccess: () => ({ mutate: state.grantMutate, isPending: false }),
    useRevokeSupportAccess: () => ({ mutate: state.revokeMutate, isPending: false }),
  };
});

describe('SupportAccessCard', () => {
  beforeEach(() => {
    state.grant = null;
    state.grantMutate.mockReset();
    state.revokeMutate.mockReset();
  });

  it('grants for 72 hours by default', () => {
    render(<SupportAccessCard organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Grant access' }));
    expect(state.grantMutate).toHaveBeenCalledWith(72, expect.any(Object));
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });

  it('offers extend and revoke while access is live', () => {
    state.grant = { expires_at: '2026-10-17T14:00:00Z' };
    render(<SupportAccessCard organizationId="org-1" />);
    expect(screen.getByText(/Active until/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Extend access' }));
    expect(state.grantMutate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(state.revokeMutate).toHaveBeenCalledTimes(1);
  });
});
