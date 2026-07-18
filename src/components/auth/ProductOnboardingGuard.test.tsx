import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { TestProviders } from '@vitest-harness/utils/TestProviders';
import ProductOnboardingGuard from '@/components/auth/ProductOnboardingGuard';

const mockStatus = vi.hoisted(() => vi.fn());
const mockOrgContext = vi.hoisted(() => ({
  organizationId: 'org-1',
  isLoading: false,
}));
const mockQueryState = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  isPending: false,
  isFetched: true,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizationId: mockOrgContext.organizationId,
    isLoading: mockOrgContext.isLoading,
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
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderGuard(initialPath: string) {
  return render(
    <TestProviders initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard/onboarding/getting-started"
          element={
            <>
              <LocationProbe />
              <ProductOnboardingGuard>
                <div>Getting started wizard</div>
              </ProductOnboardingGuard>
            </>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <>
              <LocationProbe />
              <ProductOnboardingGuard>
                <div>Dashboard content</div>
              </ProductOnboardingGuard>
            </>
          }
        />
      </Routes>
    </TestProviders>,
  );
}

describe('ProductOnboardingGuard', () => {
  beforeEach(() => {
    mockStatus.mockReset();
    mockOrgContext.organizationId = 'org-1';
    mockOrgContext.isLoading = false;
    mockQueryState.isLoading = false;
    mockQueryState.isError = false;
    mockQueryState.isPending = false;
    mockQueryState.isFetched = true;
  });

  it('redirects owners with incomplete onboarding to getting-started', async () => {
    mockStatus.mockReturnValue({
      needs_onboarding: true,
      is_org_admin: true,
      teams_count: 0,
      equipment_count: 0,
      completed_at: null,
    });

    renderGuard('/dashboard');

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/dashboard/onboarding/getting-started',
      );
    });
    expect(screen.getByText('Getting started wizard')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('renders children when onboarding is complete', () => {
    mockStatus.mockReturnValue({
      needs_onboarding: false,
      is_org_admin: true,
      teams_count: 1,
      equipment_count: 1,
      completed_at: '2026-06-14T00:00:00Z',
    });

    renderGuard('/dashboard');

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('renders children for established org admin without completed_at', () => {
    mockStatus.mockReturnValue({
      needs_onboarding: false,
      is_org_admin: true,
      teams_count: 2,
      equipment_count: 3,
      completed_at: null,
    });

    renderGuard('/dashboard');

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('bypasses guard for non-admin members', () => {
    mockStatus.mockReturnValue({
      needs_onboarding: false,
      is_org_admin: false,
      teams_count: 0,
      equipment_count: 0,
      completed_at: null,
    });

    renderGuard('/dashboard');

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('renders dashboard for established org admin with null completed_at', () => {
    mockStatus.mockReturnValue({
      needs_onboarding: false,
      is_org_admin: true,
      teams_count: 2,
      equipment_count: 3,
      completed_at: null,
    });

    renderGuard('/dashboard');

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard');
  });

  it('does not redirect when already on getting-started route', () => {
    mockStatus.mockReturnValue({
      needs_onboarding: true,
      is_org_admin: true,
      teams_count: 0,
      equipment_count: 0,
      completed_at: null,
    });

    renderGuard('/dashboard/onboarding/getting-started');

    expect(screen.getByText('Getting started wizard')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/dashboard/onboarding/getting-started',
    );
  });
});
