import { render, screen } from '@/test/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DSRCasePage from '@/pages/dsr/CasePage';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDsrCase, useDsrMutation } from '@/features/dsr/hooks/useDsrCase';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ requestId: 'dsr-123' }),
  };
});

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/dsr/hooks/useDsrCase', () => ({
  useDsrCase: vi.fn(),
  useDsrMutation: vi.fn(),
}));

vi.mock('@/features/dsr/components/DsrQueueRail', () => ({
  DsrQueueRail: () => <div data-testid="dsr-queue-rail" />,
}));

vi.mock('@/features/dsr/components/DsrCaseWorkspace', () => ({
  DsrCaseWorkspace: () => <div data-testid="dsr-case-workspace" />,
}));

const mockUseOrganization = vi.mocked(useOrganization);
const mockUsePermissions = vi.mocked(usePermissions);
const mockUseDsrCase = vi.mocked(useDsrCase);
const mockUseDsrMutation = vi.mocked(useDsrMutation);

describe('DSRCasePage', () => {
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

    mockUseDsrCase.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        request: {
          id: 'dsr-123',
          updated_at: '2026-03-31T00:00:00Z',
        },
        events: [],
      },
      error: null,
    } as never);

    mockUseDsrMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never);
  });

  it('shows a restricted state for users without DSR management access', () => {
    render(<DSRCasePage />);

    expect(screen.getByText(/restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/only organization owners\/admins can access this case workspace/i)).toBeInTheDocument();
    expect(screen.queryByTestId('dsr-case-workspace')).not.toBeInTheDocument();
  });

  it('disables the DSR hooks by passing a null organization id when unauthorized', () => {
    render(<DSRCasePage />);

    expect(mockUseDsrCase).toHaveBeenCalledWith(null, 'dsr-123');
    expect(mockUseDsrMutation).toHaveBeenCalledWith(null, 'dsr-123');
  });
});
