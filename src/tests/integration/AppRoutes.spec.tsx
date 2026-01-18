import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

// Mock auth hook to bypass provider requirement
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: {}, isLoading: false })
}));

// Mock user context hook used by layout components
vi.mock('@/contexts/useUser', () => ({
  useUser: () => ({
    currentUser: { id: '1', email: 'test@example.com', name: 'Test User' },
    isLoading: false,
    setCurrentUser: () => {}
  })
}));

// Mock simple organization hook used by the sidebar
vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: () => ({ currentOrganization: null })
}));

// Mock all page components
vi.mock('@/pages/Dashboard', () => ({ default: () => <div data-testid="dashboard-page">Dashboard</div> }));
vi.mock('@/features/equipment/pages/Equipment', () => ({ default: () => <div data-testid="equipment-page">Equipment</div> }));
vi.mock('@/features/equipment/pages/EquipmentDetails', () => ({ default: () => <div data-testid="equipment-details-page">Equipment Details</div> }));
vi.mock('@/pages/WorkOrders', () => ({ default: () => <div data-testid="work-orders-page">Work Orders</div> }));
vi.mock('@/pages/WorkOrderDetails', () => ({ default: () => <div data-testid="work-order-details-page">Work Order Details</div> }));
vi.mock('@/features/teams/pages/Teams', () => ({ default: () => <div data-testid="teams-page">Teams</div> }));
vi.mock('@/pages/FleetMap', () => ({ default: () => <div data-testid="fleet-map-page">Fleet Map</div> }));
vi.mock('@/pages/Organization', () => ({ default: () => <div data-testid="organization-page">Organization</div> }));
vi.mock('@/pages/QRScanner', () => ({ default: () => <div data-testid="scanner-page">Scanner</div> }));
vi.mock('@/pages/Billing', () => ({ default: () => <div data-testid="billing-page">Billing</div> }));
vi.mock('@/pages/Settings', () => ({ default: () => <div data-testid="settings-page">Settings</div> }));
vi.mock('@/pages/Support', () => ({ default: () => <div data-testid="support-page">Support</div> }));
vi.mock('@/components/landing/SmartLanding', () => ({ default: () => <div data-testid="landing-page">Landing</div> }));
vi.mock('@/pages/Auth', () => ({ default: () => <div data-testid="auth-page">Auth</div> }));
vi.mock('@/pages/TermsOfService', () => ({ default: () => <div data-testid="terms-page">Terms</div> }));
vi.mock('@/pages/PrivacyPolicy', () => ({ default: () => <div data-testid="privacy-page">Privacy</div> }));
vi.mock('@/components/layout/AppSidebar', () => ({ default: () => <div data-testid="app-sidebar">Sidebar</div> }));

// Mock contexts
vi.mock('@/contexts/TeamContext', () => ({
  TeamProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="team-provider">{children}</div>
}));

vi.mock('@/contexts/SimpleOrganizationProvider', () => ({
  SimpleOrganizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="simple-organization-provider">{children}</div>
  )
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  )
}));

// Mock components
vi.mock('@/components/layout/TopBar', () => ({
  default: () => <div data-testid="top-bar">TopBar</div>
}));

vi.mock('@/components/providers/AppProviders', () => {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    AppProviders: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={testQueryClient}>
        <div data-testid="app-providers">{children}</div>
      </QueryClientProvider>
    ),
  };
});

// Mock react-router-dom components
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">Navigating to {to}</div>,
    useParams: () => ({ equipmentId: 'test-equipment', workOrderId: 'test-work-order' }),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="browser-router">{children}</div>
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    );
  };

  it('renders without crashing', () => {
    renderApp();
    expect(screen.getByTestId('app-providers')).toBeInTheDocument();
  });

  it('renders landing page for root path', async () => {
    renderApp(['/']);
    expect(await screen.findByTestId('landing-page')).toBeInTheDocument();
  });

  it('renders auth page for /auth path', async () => {
    renderApp(['/auth']);
    expect(await screen.findByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders support page for /support path', async () => {
    renderApp(['/support']);
    expect(await screen.findByTestId('support-page')).toBeInTheDocument();
  });

  it('renders terms page for /terms-of-service path', async () => {
    renderApp(['/terms-of-service']);
    expect(await screen.findByTestId('terms-page')).toBeInTheDocument();
  });

  it('renders privacy page for /privacy-policy path', async () => {
    renderApp(['/privacy-policy']);
    expect(await screen.findByTestId('privacy-page')).toBeInTheDocument();
  });

  it('contains app providers', () => {
    renderApp();
    expect(screen.getByTestId('app-providers')).toBeInTheDocument();
  });

  it('redirects equipment to equipment list', () => {
    renderApp(['/equipment/test-equipment']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent(
      'Navigating to /dashboard/equipment/test-equipment'
    );
  });

  it('redirects work-orders to work-orders list', () => {
    renderApp(['/work-orders/test-work-order']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent(
      'Navigating to /dashboard/work-orders/test-work-order'
    );
  });

  it('renders TopBar component on dashboard route', async () => {
    renderApp(['/dashboard']);
    expect(await screen.findByTestId('top-bar')).toBeInTheDocument();
  });
});