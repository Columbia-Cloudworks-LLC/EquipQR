import React, { type ReactNode } from 'react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('@/components/providers/AppProviders', () => ({
  AppProviders: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock('@/contexts/TeamContext', () => ({
  TeamProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock('@/contexts/SimpleOrganizationProvider', () => ({
  SimpleOrganizationProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarInset: ({ children }: { children: ReactNode; className?: string }) => <div data-testid="sidebar-inset">{children}</div>
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock('@/components/layout/AppSidebar', () => ({
  default: () => <div data-testid="app-sidebar" />
}));

vi.mock('@/components/layout/TopBar', () => ({
  default: () => <div data-testid="top-bar" />
}));

vi.mock('@/components/layout/LegalFooter', () => ({
  default: () => <div data-testid="legal-footer" />
}));

vi.mock('@/pages/PartPicker', () => ({
  default: () => <div data-testid="part-picker-page">Part Picker</div>
}));

vi.mock('@/pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>
}));

vi.mock('@/pages/Auth', () => ({
  default: () => <div data-testid="auth-page">Auth</div>
}));

vi.mock('@/components/landing/SmartLanding', () => ({
  default: () => <div data-testid="landing-page">Landing</div>
}));

vi.mock('@/pages/DebugAuth', () => ({
  default: () => <div data-testid="debug-auth-page">DebugAuth</div>
}));

vi.mock('@/pages/Equipment', () => ({
  default: () => <div data-testid="equipment-page">Equipment</div>
}));

vi.mock('@/pages/EquipmentDetails', () => ({
  default: () => <div data-testid="equipment-details-page">Equipment Details</div>
}));

vi.mock('@/pages/WorkOrders', () => ({
  default: () => <div data-testid="work-orders-page">Work Orders</div>
}));

vi.mock('@/pages/WorkOrderDetails', () => ({
  default: () => <div data-testid="work-order-details-page">Work Order Details</div>
}));

vi.mock('@/pages/Teams', () => ({
  default: () => <div data-testid="teams-page">Teams</div>
}));

vi.mock('@/pages/TeamDetails', () => ({
  default: () => <div data-testid="team-details-page">Team Details</div>
}));

vi.mock('@/pages/FleetMap', () => ({
  default: () => <div data-testid="fleet-map-page">Fleet Map</div>
}));

vi.mock('@/pages/Organization', () => ({
  default: () => <div data-testid="organization-page">Organization</div>
}));

vi.mock('@/pages/QRScanner', () => ({
  default: () => <div data-testid="qr-scanner-page">QR Scanner</div>
}));

vi.mock('@/pages/QRRedirect', () => ({
  default: () => <div data-testid="qr-redirect-page">QR Redirect</div>
}));

vi.mock('@/pages/Billing', () => ({
  default: () => <div data-testid="billing-page">Billing</div>
}));

vi.mock('@/pages/Settings', () => ({
  default: () => <div data-testid="settings-page">Settings</div>
}));

vi.mock('@/pages/Reports', () => ({
  default: () => <div data-testid="reports-page">Reports</div>
}));

vi.mock('@/pages/Support', () => ({
  default: () => <div data-testid="support-page">Support</div>
}));

vi.mock('@/pages/PMTemplates', () => ({
  default: () => <div data-testid="pm-templates-page">PM Templates</div>
}));

vi.mock('@/pages/PMTemplateView', () => ({
  default: () => <div data-testid="pm-template-view-page">PM Template View</div>
}));

vi.mock('@/pages/Notifications', () => ({
  default: () => <div data-testid="notifications-page">Notifications</div>
}));

vi.mock('@/pages/InvitationAccept', () => ({
  default: () => <div data-testid="invitation-accept-page">Invitation Accept</div>
}));

vi.mock('@/pages/TermsOfService', () => ({
  default: () => <div data-testid="tos-page">Terms Of Service</div>
}));

vi.mock('@/pages/PrivacyPolicy', () => ({
  default: () => <div data-testid="privacy-policy-page">Privacy Policy</div>
}));

vi.mock('@/pages/DebugBilling', () => ({
  default: () => <div data-testid="debug-billing-page">Debug Billing</div>
}));

vi.mock('@/pages/BillingExemptionsAdmin', () => ({
  default: () => <div data-testid="billing-exemptions-page">Billing Exemptions</div>
}));

const loadApp = async () => {
  const module = await import('@/App');
  return module.default;
};

describe('App part picker routing', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    globalThis.__APP_DEV__ = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.__APP_DEV__ = undefined;
  });

  it('renders the part picker route in development', async () => {
    globalThis.__APP_DEV__ = true;
    const App = await loadApp();

    render(
      <MemoryRouter initialEntries={["/dashboard/part-picker"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('part-picker-page')).toBeInTheDocument();
  });

  it('redirects to the dashboard when part picker is accessed in production', async () => {
    globalThis.__APP_DEV__ = false;
    const App = await loadApp();
    const locationRef: { current: string } = { current: '' };

    const LocationTracker = () => {
      const location = useLocation();
      locationRef.current = location.pathname;
      return null;
    };

    render(
      <MemoryRouter initialEntries={["/dashboard/part-picker"]}>
        <App />
        <LocationTracker />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(locationRef.current).toBe('/dashboard');
    });

    expect(screen.queryByTestId('part-picker-page')).not.toBeInTheDocument();
  });
});
