import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: {}, isLoading: false }),
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: () => ({
    currentUser: { id: '1', email: 'test@example.com', name: 'Test User' },
    isLoading: false,
    setCurrentUser: () => {},
  }),
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: () => ({
    currentOrganization: { id: 'test-org' },
    organizationId: 'test-org',
    isLoading: false,
  }),
  useSimpleOrganizationSafe: () => null,
}));

vi.mock('@/features/onboarding/hooks/useProductOnboarding', () => ({
  useProductOnboardingStatus: () => ({
    data: {
      needs_onboarding: false,
      is_org_admin: true,
      teams_count: 1,
      equipment_count: 1,
      completed_at: '2026-01-01T00:00:00Z',
    },
    isLoading: false,
    isError: false,
    isPending: false,
    isFetched: true,
  }),
  useCompleteProductOnboarding: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => ({
    factors: [],
    currentLevel: null,
    nextLevel: null,
    isEnrolled: false,
    isVerified: false,
    needsVerification: false,
    isLoading: false,
    enrollTOTP: vi.fn(),
    verifyTOTP: vi.fn(),
    unenrollFactor: vi.fn(),
    challengeAndVerify: vi.fn(),
    refreshMFAStatus: vi.fn(),
  }),
}));

vi.mock('@/features/dashboard/pages/Dashboard', () => ({ default: () => <div data-testid="dashboard-page">Dashboard</div> }));
vi.mock('@/features/equipment/pages/Equipment', () => ({ default: () => <div data-testid="equipment-page">Equipment</div> }));
vi.mock('@/features/equipment/pages/EquipmentDetails', () => ({ default: () => <div data-testid="equipment-details-page">Equipment Details</div> }));
vi.mock('@/features/equipment/pages/EquipmentQRScan', () => ({ default: () => <div data-testid="equipment-qr-scan-page">Equipment QR Scan</div> }));
vi.mock('@/features/equipment/pages/EquipmentScanner', () => ({
  default: () => <div data-testid="equipment-scanner-page">Equipment Scanner</div>,
}));
vi.mock('@/features/work-orders/pages/WorkOrders', () => ({ default: () => <div data-testid="work-orders-page">Work Orders</div> }));
vi.mock('@/features/work-orders/pages/WorkOrderDetails', () => ({ default: () => <div data-testid="work-order-details-page">Work Order Details</div> }));
vi.mock('@/features/teams/pages/Teams', () => ({ default: () => <div data-testid="teams-page">Teams</div> }));
vi.mock('@/features/fleet-map/pages/FleetMap', () => ({ default: () => <div data-testid="fleet-map-page">Fleet Map</div> }));
vi.mock('@/features/organization/pages/Organization', () => ({ default: () => <div data-testid="organization-page">Organization</div> }));
vi.mock('@/pages/Settings', () => ({ default: () => <div data-testid="settings-page">Settings</div> }));
vi.mock('@/pages/Support', () => ({ default: () => <div data-testid="support-page">Support</div> }));
vi.mock('@/components/landing/SmartLanding', () => ({ default: () => <div data-testid="landing-page">Landing</div> }));
vi.mock('@/pages/Auth', () => ({ default: () => <div data-testid="auth-page">Auth</div> }));
vi.mock('@/pages/TermsOfService', () => ({ default: () => <div data-testid="terms-page">Terms</div> }));
vi.mock('@/pages/PrivacyPolicy', () => ({ default: () => <div data-testid="privacy-page">Privacy</div> }));
vi.mock('@/pages/PrivacyRequest', () => ({ default: () => <div data-testid="privacy-request-page">Privacy Request</div> }));
vi.mock('@/pages/DoNotSellOrShare', () => ({
  default: () => <div data-testid="do-not-sell-or-share-page">Do Not Sell Or Share</div>,
}));
vi.mock('@/pages/dsr/CockpitPage', () => ({ default: () => <div data-testid="dsr-cockpit-page">DSR Cockpit</div> }));
vi.mock('@/pages/dsr/CasePage', () => ({ default: () => <div data-testid="dsr-case-page">DSR Case</div> }));
vi.mock('@/components/layout/AppSidebar', () => ({ default: () => <div data-testid="app-sidebar">Sidebar</div> }));

vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: () => ({
    canView: true,
    canEdit: true,
    isPartsManager: false,
    isPartsConsumer: false,
    isLoading: false,
    currentOrganization: { id: 'test-org' },
  }),
}));
vi.mock('@/lib/flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/flags')>();
  return {
    ...actual,
    OFFLINE_QUEUE_ENABLED: false,
  };
});

vi.mock('@/contexts/TeamContext', () => ({
  TeamProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="team-provider">{children}</div>,
}));

vi.mock('@/contexts/SelectedTeamContext', () => ({
  SelectedTeamProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="selected-team-provider">{children}</div>
  ),
}));

vi.mock('@/contexts/SimpleOrganizationProvider', () => ({
  SimpleOrganizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="simple-organization-provider">{children}</div>
  ),
}));

vi.mock('@/contexts/OfflineQueueContext', () => ({
  OfflineQueueProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="offline-queue-provider">{children}</div>
  ),
  useOfflineQueue: () => ({
    queuedItems: [],
    pendingCount: 0,
    failedCount: 0,
    isOnline: true,
    isSyncing: false,
    enqueue: vi.fn(),
    syncNow: vi.fn(),
    removeItem: vi.fn(),
    clearQueue: vi.fn(),
    retryFailed: vi.fn(),
  }),
}));

vi.mock('@/features/offline-queue/components/PendingSyncBanner', () => ({
  PendingSyncBanner: () => <div data-testid="pending-sync-banner" />,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  ),
}));

vi.mock('@/components/ui/sidebar-context', () => ({
  useSidebar: () => ({
    state: 'expanded' as const,
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
    toggleSidebar: vi.fn(),
  }),
}));

vi.mock('@/components/layout/TopBar', () => ({
  default: () => <div data-testid="top-bar">TopBar</div>,
}));

/** Sync stubs so App.routes avoids React.lazy / Suspense ticks per route. */
vi.mock('@/routes/lazyPublicPages', () => ({
  Auth: () => <div data-testid="auth-page">Auth</div>,
  DebugAuth: null,
  DebugScanFeedback: null,
  RepairShops: () => null,
  PMTemplatesFeature: () => null,
  InventoryManagementFeature: () => null,
  PartLookupAlternatesFeature: () => null,
  QRCodeIntegrationFeature: () => null,
  GoogleWorkspaceFeature: () => null,
  QuickBooksFeature: () => null,
  WorkOrderManagementFeature: () => null,
  TeamCollaborationFeature: () => null,
  FleetVisualizationFeature: () => null,
  CustomerCRMFeature: () => null,
  MobileFirstDesignFeature: () => null,
  EquipmentQRScan: () => <div data-testid="equipment-qr-scan-page">Equipment QR Scan</div>,
  InventoryQRRedirect: () => null,
  WorkOrderQRRedirect: () => null,
  LegacyEquipmentQRRedirect: () => null,
  Support: () => <div data-testid="support-page">Support</div>,
  InvitationAccept: () => null,
  TermsOfService: () => <div data-testid="terms-page">Terms</div>,
  PrivacyPolicy: () => <div data-testid="privacy-page">Privacy</div>,
  PrivacyRequest: () => <div data-testid="privacy-request-page">Privacy Request</div>,
  DoNotSellOrShare: () => <div data-testid="do-not-sell-or-share-page">Do Not Sell Or Share</div>,
  Security: () => null,
  OperatorCheckInPublicPage: () => null,
  QuickFormPublicPage: () => null,
}));

vi.mock('@/routes/lazyDashboardPages', () => ({
  AppSidebar: () => <div data-testid="app-sidebar">Sidebar</div>,
  TopBar: () => <div data-testid="top-bar">TopBar</div>,
  BottomNav: () => null,
  Dashboard: () => <div data-testid="dashboard-page">Dashboard</div>,
  Equipment: () => <div data-testid="equipment-page">Equipment</div>,
  BulkEquipment: () => null,
  EquipmentDetails: () => <div data-testid="equipment-details-page">Equipment Details</div>,
  EquipmentScanner: () => <div data-testid="equipment-scanner-page">Equipment Scanner</div>,
  WorkOrders: () => <div data-testid="work-orders-page">Work Orders</div>,
  WorkOrderDetails: () => <div data-testid="work-order-details-page">Work Order Details</div>,
  Teams: () => <div data-testid="teams-page">Teams</div>,
  TeamDetails: () => null,
  FleetMap: () => <div data-testid="fleet-map-page">Fleet Map</div>,
  Organization: () => <div data-testid="organization-page">Organization</div>,
  OrganizationMembers: () => null,
  OrganizationIntegrations: () => null,
  Settings: () => <div data-testid="settings-page">Settings</div>,
  Reports: () => null,
  DashboardSupport: () => null,
  PMTemplates: () => null,
  PMTemplateView: () => null,
  PMTemplateEditor: () => null,
  Notifications: () => null,
  WorkspaceOnboarding: () => null,
  GettingStartedOnboarding: () => null,
  InventoryList: () => null,
  BulkInventory: () => null,
  InventoryItemDetail: () => null,
  PartLookup: () => null,
  AlternateGroupsPage: () => null,
  AlternateGroupDetail: () => null,
  AuditLog: () => null,
  DSRCockpitPage: () => <div data-testid="dsr-cockpit-page">DSR Cockpit</div>,
  DSRCasePage: () => <div data-testid="dsr-case-page">DSR Case</div>,
  OperatorCheckInsPage: () => null,
  QuickFormsPage: () => null,
}));

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export let testQueryClient: QueryClient = createTestQueryClient();

vi.mock('@/components/providers/AppProviders', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <div data-testid="app-providers">{children}</div>
    </QueryClientProvider>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({
      to,
    }: {
      to: string | { pathname: string; hash?: string; search?: string };
    }) => (
      <div data-testid="navigate-to">
        Navigating to{' '}
        {typeof to === 'string'
          ? to
          : `${to.pathname}${to.search ?? ''}${to.hash ?? ''}`}
      </div>
    ),
    useParams: () => ({ equipmentId: 'test-equipment', workOrderId: 'test-work-order' }),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="browser-router">{children}</div>
    ),
  };
});

export function resetAppRoutesTestQueryClient(): void {
  testQueryClient = createTestQueryClient();
}
