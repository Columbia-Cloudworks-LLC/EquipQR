import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamMetadataEditor from '@/features/teams/components/TeamMetadataEditor';
import type { TeamWithMembers } from '@/features/teams/types/team';

const mockUpdateTeam = vi.fn();
const mockUpsertPolicy = vi.fn();
const mockToast = vi.fn();
const mockOnClose = vi.fn();

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
});
