import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/routes/lazyDashboardPages', () => {
  const stub = (label: string) => () => <div>{label}</div>;

  return {
    Dashboard: stub('Dashboard Route'),
    Equipment: stub('Equipment Route'),
    BulkEquipment: stub('Bulk Equipment Route'),
    EquipmentDetails: stub('Equipment Details Route'),
    EquipmentScanner: stub('Equipment Scanner Route'),
    WorkOrders: stub('Work Orders Route'),
    WorkOrderDetails: stub('Work Order Details Route'),
    Teams: stub('Teams Route'),
    TeamDetails: stub('Team Details Route'),
    FleetMap: stub('Fleet Map Route'),
    Organization: stub('Organization Route'),
    OrganizationMembers: stub('Organization Members Route'),
    OrganizationIntegrations: stub('Organization Integrations Route'),
    PMTemplates: stub('PM Templates Route'),
    PMTemplateEditor: stub('PM Template Editor Route'),
    PMTemplateView: stub('PM Template View Route'),
    Notifications: stub('Notifications Route'),
    Settings: stub('Settings Route'),
    WorkspaceOnboarding: stub('Workspace Onboarding Route'),
    GettingStartedOnboarding: stub('Getting Started Onboarding Route'),
    Reports: stub('Reports Route'),
    InventoryList: stub('Inventory List Route'),
    BulkInventory: stub('Bulk Inventory Route'),
    InventoryItemDetail: stub('Inventory Item Detail Route'),
    PartLookup: stub('Part Lookup Route'),
    AlternateGroupsPage: stub('Alternate Groups Route'),
    AlternateGroupDetail: stub('Alternate Group Detail Route'),
    DashboardSupport: stub('Dashboard Support Route'),
    AuditLog: stub('Audit Log Route'),
    DSRCockpitPage: stub('DSR Cockpit Route'),
    DSRCasePage: stub('DSR Case Route'),
    OperatorCheckInsPage: stub('Operator Check-Ins Route'),
    QuickFormsPage: stub('Quick Forms Route'),
  };
});

vi.mock('@/features/inventory/components/InventoryAccessGuard', () => ({
  InventoryAccessGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { dashboardRouteElements } from './DashboardRoutes';

function DashboardRoutesHarness() {
  return <Routes>{dashboardRouteElements}</Routes>;
}

describe('dashboardRouteElements', () => {
  it('renders the organization settings page for /dashboard/organization/settings', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/organization/settings']}>
        <Routes>
          <Route path="/dashboard/*" element={<DashboardRoutesHarness />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Organization Route')).toBeInTheDocument();
  });
});
