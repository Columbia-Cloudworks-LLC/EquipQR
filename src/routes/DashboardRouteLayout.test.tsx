import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardRouteLayout } from './DashboardRouteLayout';

const mockAuthState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'owner@example.com' } as
    | { id: string; email: string; app_metadata?: { provider?: string; providers?: string[] } }
    | null,
  isLoading: false,
}));

const mockMFAState = vi.hoisted(() => ({
  isEnrolled: true,
  isVerified: true,
  isLoading: false,
  refreshMFAStatus: vi.fn(),
}));

const mockOrgState = vi.hoisted(() => ({
  currentOrganization: { userRole: 'admin' } as { userRole: string } | null,
  isLoading: false,
  organizationId: 'org-1' as string | null,
}));

const mockWorkspaceState = vi.hoisted(() => ({
  data: {
    domain_status: 'unclaimed',
    domain: 'example.com',
    has_workspace_membership: false,
    has_other_organization_membership: false,
    has_pending_invitation: false,
    has_pending_claim: false,
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

const mockProductState = vi.hoisted(() => ({
  data: {
    needs_onboarding: false,
    is_org_admin: true,
    teams_count: 1,
    equipment_count: 1,
    completed_at: '2026-08-26T00:00:00Z',
  },
  isLoading: false,
  isPending: false,
  isFetched: true,
  isError: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => mockMFAState,
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganizationSafe: () => ({
    currentOrganization: mockOrgState.currentOrganization,
    isLoading: mockOrgState.isLoading,
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizationId: mockOrgState.organizationId,
    isLoading: mockOrgState.isLoading,
  }),
}));

vi.mock('@/hooks/useWorkspaceOnboarding', () => ({
  useWorkspaceOnboardingState: () => mockWorkspaceState,
}));

vi.mock('@/features/onboarding/hooks/useProductOnboarding', () => ({
  useProductOnboardingStatus: () => mockProductState,
}));

vi.mock('@/contexts/SimpleOrganizationProvider', () => ({
  SimpleOrganizationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/TeamContext', () => ({
  TeamProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/SelectedTeamContext', () => ({
  SelectedTeamProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarInset: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/layout/LegalFooter', () => ({
  default: () => <div>Legal footer</div>,
}));

vi.mock('@/routes/OptionalOfflineQueueProvider', () => ({
  OptionalOfflineQueueProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/tickets/context/BugReportContext', () => ({
  BugReportProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/offline-queue/components/PendingSyncBanner', () => ({
  PendingSyncBanner: () => <div>Pending sync</div>,
}));

vi.mock('@/routes/lazyDashboardPages', () => ({
  AppSidebar: () => <aside>Sidebar</aside>,
  TopBar: () => <header>TopBar</header>,
  BottomNav: () => <nav>BottomNav</nav>,
}));

vi.mock('@/routes/DashboardRoutes', async () => {
  const { Route } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    dashboardRouteElements: (
      <>
        <Route path="/" element={<div>Dashboard content</div>} />
        <Route path="/equipment" element={<div>Equipment content</div>} />
        <Route path="/notifications" element={<div>Notifications content</div>} />
        <Route path="/organization/settings" element={<div>Organization settings content</div>} />
      </>
    ),
  };
});

vi.mock('@/lib/flags', async () => {
  const actual = await vi.importActual<typeof import('@/lib/flags')>('@/lib/flags');
  return {
    ...actual,
    OFFLINE_QUEUE_ENABLED: false,
    isMFAEnabled: () => true,
  };
});

function renderLayout(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard/*" element={<DashboardRouteLayout />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardRouteLayout loading shell', () => {
  beforeEach(() => {
    mockAuthState.user = { id: 'user-1', email: 'owner@example.com' };
    mockAuthState.isLoading = false;
    mockMFAState.isEnrolled = true;
    mockMFAState.isVerified = true;
    mockMFAState.isLoading = false;
    mockOrgState.currentOrganization = { userRole: 'admin' };
    mockOrgState.isLoading = false;
    mockOrgState.organizationId = 'org-1';
    mockWorkspaceState.data = {
      domain_status: 'unclaimed',
      domain: 'example.com',
      has_workspace_membership: false,
      has_other_organization_membership: false,
      has_pending_invitation: false,
      has_pending_claim: false,
    };
    mockWorkspaceState.isLoading = false;
    mockWorkspaceState.isError = false;
    mockProductState.data = {
      needs_onboarding: false,
      is_org_admin: true,
      teams_count: 1,
      equipment_count: 1,
      completed_at: '2026-08-26T00:00:00Z',
    };
    mockProductState.isLoading = false;
    mockProductState.isPending = false;
    mockProductState.isFetched = true;
    mockProductState.isError = false;
  });

  it.each([
    '/dashboard',
    '/dashboard/equipment',
    '/dashboard/notifications',
    '/dashboard/organization/settings',
  ])('keeps shell chrome visible during auth bootstrap for %s', (route) => {
    mockAuthState.isLoading = true;

    renderLayout(route);

    expect(screen.getByTestId('dashboard-loading-shell')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-loading-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-loading-header')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /checking authentication/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.queryByText(/content$/i)).not.toBeInTheDocument();
  });

  it('keeps shell chrome visible while MFA requirements are loading', () => {
    mockMFAState.isLoading = true;

    renderLayout('/dashboard/organization/settings');

    expect(screen.getByTestId('dashboard-loading-shell')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /checking security requirements/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.queryByText('Organization settings content')).not.toBeInTheDocument();
  });

  it('keeps shell chrome visible while workspace access is loading', () => {
    mockAuthState.user = {
      id: 'user-1',
      email: 'owner@claimed.test',
      app_metadata: { provider: 'google', providers: ['google'] },
    };
    mockWorkspaceState.isLoading = true;

    renderLayout('/dashboard/notifications');

    expect(screen.getByTestId('dashboard-loading-shell')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /checking workspace access/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.queryByText('Notifications content')).not.toBeInTheDocument();
  });

  it('keeps shell chrome visible while onboarding status is loading', () => {
    mockProductState.isLoading = true;
    mockProductState.isPending = true;
    mockProductState.isFetched = false;

    renderLayout('/dashboard');

    expect(screen.getByTestId('dashboard-loading-shell')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /checking onboarding status/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });
});
