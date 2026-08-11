import { screen, waitFor, render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route, useLocation } from 'react-router-dom';
import { TestProviders } from '@vitest-harness/utils/TestProviders';
import GettingStartedOnboarding from '@/features/onboarding/pages/GettingStartedOnboarding';

const mockStatus = vi.hoisted(() => vi.fn());
const mockOrgContext = vi.hoisted(() => ({
  organizationId: 'org-1',
}));
const mockQueryState = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  isPending: false,
  isFetched: true,
}));
const mockTeams = vi.hoisted(() => vi.fn(() => ({ teams: [] as Array<{ id: string; name: string }> })));
const mockEquipmentList = vi.hoisted(() =>
  vi.fn(() => ({ data: { data: [] as Array<{ id: string; name: string }>, count: 0 } })),
);
const mockCompleteMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizationId: mockOrgContext.organizationId,
    isLoading: false,
  }),
}));

vi.mock('@/features/onboarding/hooks/useProductOnboarding', () => ({
  useProductOnboardingStatus: () => ({
    data: mockStatus(),
    isLoading: mockQueryState.isLoading,
    isError: mockQueryState.isError,
    isPending: mockQueryState.isPending,
    isFetched: mockQueryState.isFetched,
  }),
  useCompleteProductOnboarding: () => mockCompleteMutation,
}));

vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: () => mockTeams(),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentList: (...args: unknown[]) => mockEquipmentList(...args),
}));

vi.mock('@/features/onboarding/components/steps/CreateFirstTeamStep', () => ({
  CreateFirstTeamStep: () => <div data-testid="onboarding-step-create-team">Team step</div>,
}));

vi.mock('@/features/onboarding/components/steps/CreateFirstEquipmentStep', () => ({
  CreateFirstEquipmentStep: () => (
    <div data-testid="onboarding-step-create-equipment">Equipment step</div>
  ),
}));

vi.mock('@/features/onboarding/components/steps/QRCodeOnboardingStep', () => ({
  QRCodeOnboardingStep: () => <div data-testid="onboarding-step-qr-code">QR step</div>,
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: vi.fn() }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderWizard(initialPath = '/dashboard/onboarding/getting-started') {
  return render(
    <TestProviders initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard/onboarding/getting-started"
          element={
            <>
              <LocationProbe />
              <GettingStartedOnboarding />
            </>
          }
        />
        <Route path="/dashboard" element={<LocationProbe />} />
      </Routes>
    </TestProviders>,
  );
}

describe('GettingStartedOnboarding', () => {
  beforeEach(() => {
    mockStatus.mockReset();
    mockTeams.mockReset();
    mockTeams.mockReturnValue({ teams: [] });
    mockEquipmentList.mockReset();
    mockEquipmentList.mockReturnValue({ data: { data: [], count: 0 } });
    mockOrgContext.organizationId = 'org-1';
    mockQueryState.isLoading = false;
    mockQueryState.isError = false;
    mockQueryState.isPending = false;
    mockQueryState.isFetched = true;
  });

  it('redirects non-admin members to dashboard', async () => {
    mockStatus.mockReturnValue({
      needs_onboarding: false,
      is_org_admin: false,
      teams_count: 0,
      equipment_count: 0,
      completed_at: null,
    });

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard');
    });
    expect(screen.queryByTestId('getting-started-onboarding')).not.toBeInTheDocument();
  });

  it('redirects established org admins to dashboard', async () => {
    mockStatus.mockReturnValue({
      needs_onboarding: false,
      is_org_admin: true,
      teams_count: 2,
      equipment_count: 3,
      completed_at: null,
    });

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard');
    });
  });

  it('starts at equipment step for partial setup with teams only', async () => {
    mockStatus.mockReturnValue({
      needs_onboarding: true,
      is_org_admin: true,
      teams_count: 1,
      equipment_count: 0,
      completed_at: null,
    });
    mockTeams.mockReturnValue({
      teams: [{ id: 'team-1', name: 'Field Crew' }],
    });

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-step-create-equipment')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('onboarding-step-create-team')).not.toBeInTheDocument();
  });
});
