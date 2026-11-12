/**
 * Regression tests: lazy-tab gating for the equipment QR scan path (#694).
 *
 * Renders the real EquipmentDetails page. Each secondary tab is a lazy module,
 * mocked here with a stub that marks itself in the DOM when mounted. Inactive
 * tabs must not mount (so their data hooks never run on a QR scan), and only
 * the selected tab's content may be mounted at any time.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import EquipmentDetails from './EquipmentDetails';

const LAZY_TAB_TEST_IDS = [
  'notes-tab',
  'work-orders-tab',
  'parts-tab',
  'images-tab',
  'check-ins-tab',
  'scan-history-tab',
] as const;

vi.mock('@/features/equipment/components/EquipmentNotesTab', () => ({
  default: () => <div data-testid="notes-tab" />,
}));
vi.mock('@/features/equipment/components/EquipmentWorkOrdersTab', () => ({
  default: () => <div data-testid="work-orders-tab" />,
}));
vi.mock('@/features/equipment/components/EquipmentPartsTab', () => ({
  default: () => <div data-testid="parts-tab" />,
}));
vi.mock('@/features/equipment/components/EquipmentImagesTab', () => ({
  default: () => <div data-testid="images-tab" />,
}));
vi.mock('@/features/equipment/components/EquipmentScanHistoryTab', () => ({
  default: () => <div data-testid="scan-history-tab" />,
}));
vi.mock('@/features/equipment/components/EquipmentOperatorCheckinLedgerTab', () => ({
  default: () => <div data-testid="check-ins-tab" />,
}));
vi.mock('@/features/equipment/components/EquipmentDetailsTab', () => ({
  default: () => <div data-testid="details-tab" />,
}));

// Page chrome that is not under test.
vi.mock('@/features/equipment/components/EquipmentDetailsDesktopSummary', () => ({
  EquipmentDetailsDesktopSummary: () => null,
}));
vi.mock('@/features/equipment/components/EquipmentServiceSummaryBadge', () => ({
  EquipmentServiceSummaryBadge: () => null,
}));
vi.mock('@/features/equipment/components/EquipmentDetailsModals', () => ({
  EquipmentDetailsModals: () => null,
}));
vi.mock('@/features/equipment/components/EquipmentForm', () => ({ default: () => null }));
vi.mock('@/features/equipment/components/MobileEquipmentHeader', () => ({ default: () => null }));
vi.mock('@/features/equipment/components/MobileEquipmentActionBar', () => ({ default: () => null }));
vi.mock('@/features/equipment/components/EquipmentQuickAccessDrawer', () => ({
  EquipmentQuickAccessDrawer: () => null,
}));
vi.mock('@/components/location/EquipmentLocationMapPanel', () => ({
  EquipmentLocationMapPanel: () => null,
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
      userRole: 'owner',
      scanLocationCollectionEnabled: false,
    },
    isLoading: false,
  }),
}));
vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ getUserTeamIds: () => [], isLoading: false }),
}));
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentById: () => ({
    data: {
      id: 'eq-1',
      name: 'Forklift A1',
      manufacturer: 'Toyota',
      model: '8FGU25',
      serial_number: 'SN-1',
      team_id: null,
      team: null,
      image_url: null,
    },
    isLoading: false,
  }),
}));
vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: () => ({ canView: true, isLoading: false }),
}));
vi.mock('@/features/equipment/hooks/useEquipmentScanLogger', () => ({
  useEquipmentScanLogger: () => undefined,
}));
vi.mock('@/features/equipment/transitions/useScrollMainContentToTopOnMount', () => ({
  useScrollMainContentToTopOnMount: () => undefined,
}));
vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({
    equipment: { getPermissions: () => ({ canEdit: false }) },
  }),
}));
vi.mock('@/features/equipment/hooks/useSaveEquipmentAssignedLocation', () => ({
  useSaveEquipmentAssignedLocation: () => ({
    saveAssignedLocation: vi.fn(),
    isSavingLocation: false,
  }),
}));
vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: () => ({ isLoaded: false }),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canCreateEquipment: () => false,
    canCreateEquipmentForTeam: () => false,
  }),
}));

const renderPage = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/equipment/eq-1${search}`]}>
      <Routes>
        <Route path="/dashboard/equipment/:equipmentId" element={<EquipmentDetails />} />
      </Routes>
    </MemoryRouter>,
  );

/** Lets pending React.lazy imports resolve so a wrongly mounted tab would show up. */
const settleLazyTabs = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** Asserts that `mounted` is the only lazy tab whose content is in the DOM. */
const expectOnlyLazyTabMounted = (mounted: (typeof LAZY_TAB_TEST_IDS)[number] | null) => {
  // A mounted-but-suspended tab renders this skeleton (inside a possibly hidden panel).
  expect(screen.queryByRole('status', { name: 'Loading tab content', hidden: true })).not.toBeInTheDocument();
  for (const testId of LAZY_TAB_TEST_IDS) {
    if (testId === mounted) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
  }
};

describe('EquipmentDetails lazy-tab gating (issue #694)', () => {
  it('mounts only the details tab on initial load', async () => {
    renderPage();

    expect(await screen.findByTestId('details-tab')).toBeInTheDocument();
    await settleLazyTabs();
    expectOnlyLazyTabMounted(null);
  });

  it('mounts only the requested tab when opened with ?tab=', async () => {
    renderPage('?tab=notes');

    expect(await screen.findByTestId('notes-tab')).toBeInTheDocument();
    await settleLazyTabs();
    expectOnlyLazyTabMounted('notes-tab');
    expect(screen.queryByTestId('details-tab')).not.toBeInTheDocument();
  });

  it('mounts the selected tab and unmounts the previous one when switching tabs', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('details-tab');

    await user.click(screen.getByRole('tab', { name: /Work Orders/ }));
    expect(await screen.findByTestId('work-orders-tab')).toBeInTheDocument();
    await settleLazyTabs();
    expectOnlyLazyTabMounted('work-orders-tab');

    await user.click(screen.getByRole('tab', { name: /Notes/ }));
    expect(await screen.findByTestId('notes-tab')).toBeInTheDocument();
    await settleLazyTabs();
    expectOnlyLazyTabMounted('notes-tab');

    await user.click(screen.getByRole('tab', { name: /Details/ }));
    await waitFor(() => expect(screen.getByTestId('details-tab')).toBeInTheDocument());
    await settleLazyTabs();
    expectOnlyLazyTabMounted(null);
  });
});
