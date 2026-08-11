import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamMetadataEditor from '@/features/teams/components/TeamMetadataEditor';
import type { TeamWithMembers } from '@/features/teams/types/team';

const mockUpdateTeam = vi.fn();
const mockUpsertPolicy = vi.fn();
const mockToast = vi.fn();
const mockOnClose = vi.fn();
const mockCanManageTeam = vi.fn(() => true);
const mockIsOrganizationAdmin = vi.fn(() => true);

vi.mock('@/features/teams/services/teamService', () => ({
  updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
  uploadTeamImage: vi.fn(),
  deleteTeamImage: vi.fn(),
}));

vi.mock('@/features/pm-templates/services/pmIntervalPolicyService', () => ({
  pmIntervalPolicyService: {
    upsertPolicy: (...args: unknown[]) => mockUpsertPolicy(...args),
  },
  policyRowToFormState: vi.fn(() => ({
    mode: 'inherit',
    intervalValue: null,
    intervalType: 'days',
  })),
}));

vi.mock('@/features/pm-templates/hooks/usePMIntervalPolicies', () => ({
  usePMIntervalPolicy: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1' } }),
}));

vi.mock('@/features/teams/hooks/useCustomerAccount', () => ({
  useCustomersByOrg: () => ({ data: [] }),
}));

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: () => ({ isLoaded: true }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageTeam: (...args: unknown[]) => mockCanManageTeam(...args),
    isOrganizationAdmin: () => mockIsOrganizationAdmin(),
  }),
}));

vi.mock('@/components/common/SingleImageUpload', () => ({
  default: () => <div data-testid="single-image-upload" />,
}));

vi.mock('@/features/teams/components/TeamLocationFormFields', () => ({
  TeamLocationFormFields: () => <div data-testid="team-location-fields" />,
}));

vi.mock('@/features/pm-templates/components/PMSchedulePolicyFields', () => ({
  PMSchedulePolicyFields: () => <div data-testid="pm-schedule-policy-fields" />,
}));

const mockTeam: TeamWithMembers = {
  id: 'team-1',
  name: 'Maintenance Team',
  description: 'Handles maintenance',
  organization_id: 'org-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  override_equipment_location: false,
  customer_id: null,
  members: [],
  member_count: 1,
};

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <TeamMetadataEditor open onClose={mockOnClose} team={mockTeam} />
    </QueryClientProvider>
  );

  return { invalidateSpy };
}

describe('TeamMetadataEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanManageTeam.mockReturnValue(true);
    mockIsOrganizationAdmin.mockReturnValue(true);
    mockUpdateTeam.mockResolvedValue({ ...mockTeam, name: 'Updated Team' });
    mockUpsertPolicy.mockRejectedValue(new Error('Policy save failed'));
  });

  it('invalidates team queries and reports partial failure when PM schedule save fails', async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', expect.objectContaining({
        name: 'Maintenance Team',
      }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['team', 'team-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['teams', 'org-1'] });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Team updated, but PM schedule was not saved',
        variant: 'destructive',
      })
    );
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('skips upsertPolicy and saves team metadata when user is team manager only (not org admin)', async () => {
    mockCanManageTeam.mockReturnValue(true);
    mockIsOrganizationAdmin.mockReturnValue(false);
    mockUpsertPolicy.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', expect.objectContaining({
        name: 'Maintenance Team',
      }));
    });

    expect(mockUpsertPolicy).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Team updated',
      })
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('re-checks isOrganizationAdmin at submit time and blocks upsertPolicy if denied', async () => {
    mockCanManageTeam.mockReturnValue(true);
    mockIsOrganizationAdmin.mockReturnValue(false);
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalled();
    });

    expect(mockIsOrganizationAdmin).toHaveBeenCalled();
    expect(mockUpsertPolicy).not.toHaveBeenCalled();
  });

  it('blocks submit and shows permission denied when user cannot manage the team', async () => {
    mockCanManageTeam.mockReturnValue(false);
    renderEditor();

    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(mockCanManageTeam).toHaveBeenCalledWith('team-1');
    expect(mockUpdateTeam).not.toHaveBeenCalled();
    expect(mockUpsertPolicy).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Permission denied',
        variant: 'destructive',
      })
    );
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
