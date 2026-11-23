import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockReadLast = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', userRole: 'member' } }),
}));

vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ getUserTeamIds: () => ['team-a'] }),
}));

vi.mock('@/features/offline-queue/hooks/useOfflineEquipmentDownload', () => ({
  readLastOfflineDownload: mockReadLast,
}));

import { OfflineCopyStatus } from './OfflineCopyStatus';

describe('OfflineCopyStatus', () => {
  beforeEach(() => mockReadLast.mockReset());

  it('says how old the saved copy is, looked up for this user, organization and team access', () => {
    mockReadLast.mockReturnValue(Date.now() - 2 * 60 * 60 * 1000);

    render(<OfflineCopyStatus />);

    expect(
      screen.getByText(/Equipment, work orders and inventory were saved to this device about 2 hours ago/),
    ).toBeInTheDocument();
    expect(mockReadLast).toHaveBeenCalledWith('user-1', 'org-1', { isOrgAdmin: false, userTeamIds: ['team-a'] });
  });

  it('says so when no copy has been saved yet', () => {
    mockReadLast.mockReturnValue(null);

    render(<OfflineCopyStatus />);

    expect(screen.getByText(/A full copy has not been saved to this device yet/)).toBeInTheDocument();
  });
});
