import { render, screen } from '@/test/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DSRCockpitPage from '@/pages/dsr/CockpitPage';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDsrQueue } from '@/features/dsr/hooks/useDsrQueue';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/dsr/hooks/useDsrQueue', () => ({
  useDsrQueue: vi.fn(),
}));

vi.mock('@/features/dsr/components/DsrQueueRail', () => ({
  DsrQueueRail: () => <div data-testid="dsr-queue-rail" />,
}));

const mockUseOrganization = vi.mocked(useOrganization);
const mockUsePermissions = vi.mocked(usePermissions);
const mockUseDsrQueue = vi.mocked(useDsrQueue);

describe('DSRCockpitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseOrganization.mockReturnValue({
      currentOrganization: {
        id: 'org-123',
        name: 'Acme Rentals',
        userRole: 'member',
      },
    } as never);

    mockUsePermissions.mockReturnValue({
      canManageOrganization: () => false,
    } as never);

    mockUseDsrQueue.mockReturnValue({
      isError: false,
      data: [],
      error: null,
    } as never);
  });

  it('shows a restricted state for users without DSR cockpit access', () => {
    render(<DSRCockpitPage />);

    expect(screen.getByText(/restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/only organization owners\/admins can access this cockpit/i)).toBeInTheDocument();
    expect(screen.queryByTestId('dsr-queue-rail')).not.toBeInTheDocument();
  });

  it('disables the queue hook by passing a null organization id when unauthorized', () => {
    render(<DSRCockpitPage />);

    expect(mockUseDsrQueue).toHaveBeenCalledWith(null);
  });
});
