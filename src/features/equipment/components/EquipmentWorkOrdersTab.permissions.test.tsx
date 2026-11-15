import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentWorkOrdersTab from './EquipmentWorkOrdersTab';
import { useEquipmentWorkOrders } from '@/features/equipment/hooks/useEquipment';
import type { EquipmentWorkOrder } from '@/features/equipment/services/EquipmentService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { permissionEngine } from '@/services/permissions/PermissionEngine';
import type { Tables } from '@/integrations/supabase/types';
import { personas, type PersonaKey } from '@vitest-harness/fixtures/personas';
import {
  createMockAuthForPersona,
  createMockSessionForPersona,
} from '@vitest-harness/utils/mock-provider-values';

/**
 * #1729: on an equipment's Work Orders tab, a manager of the equipment's team
 * must get the same edit/assign controls as on the main Work Orders list.
 *
 * The cards and the PermissionEngine are real; only the session/auth hooks
 * (persona) and the leaf controls that fetch data are stubbed. The stubs expose
 * whether each permission-gated control is rendered and enabled.
 */

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentWorkOrders: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Rendered only when canEdit is true on both cards.
vi.mock('@/features/work-orders/components/WorkOrderCostSubtotal', () => ({
  default: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid={`edit-control-${workOrderId}`}>Cost subtotal</div>
  ),
}));

// Desktop assign control; disabled unless canEditAssignment is true.
vi.mock('@/features/work-orders/components/WorkOrderAssignmentHover', () => ({
  WorkOrderAssignmentHover: ({
    workOrder,
    disabled,
    children,
  }: {
    workOrder: { id: string };
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <div data-testid={`assign-control-${workOrder.id}`} data-disabled={String(Boolean(disabled))}>
      {children}
    </div>
  ),
}));

vi.mock('@/features/work-orders/components/PMProgressIndicator', () => ({
  default: () => null,
}));

// Status/quick-action widgets need team and query providers; not under test here.
vi.mock('@/features/work-orders/components/WorkOrderPrimaryActionButton', () => ({
  WorkOrderPrimaryActionButton: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderQuickActions', () => ({
  WorkOrderQuickActions: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: () => null,
}));

vi.mock('./EquipmentPMInfo', () => ({
  default: () => null,
}));

const TEAM_ID = 'team-maintenance';

const equipment: Tables<'equipment'> = {
  id: 'eq-1',
  organization_id: 'org-1',
  name: 'Forklift 7',
  manufacturer: 'Toyota',
  model: '8FGU25',
  serial_number: 'SN-7',
  status: 'active',
  location: 'Warehouse A',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  installation_date: '2026-01-01',
  warranty_expiration: null,
  last_maintenance: null,
  last_maintenance_work_order_id: null,
  notes: null,
  custom_attributes: null,
  image_url: null,
  team_id: TEAM_ID,
  default_pm_template_id: null,
  working_hours: null,
  last_known_location: null,
  customer_id: null,
  import_id: null,
  assigned_location_street: null,
  assigned_location_city: null,
  assigned_location_state: null,
  assigned_location_country: null,
  assigned_location_lat: null,
  assigned_location_lng: null,
  use_team_location: false,
};

const workOrder: EquipmentWorkOrder = {
  id: 'wo-1',
  title: 'Hydraulic leak',
  description: 'Check the lift cylinder',
  status: 'submitted',
  priority: 'medium',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  created_by: 'someone-else',
  created_by_admin: null,
  created_by_name: null,
  created_date: '2026-01-15',
  due_date: null,
  due_date_has_time: false,
  completed_date: null,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  equipment_working_hours_at_creation: null,
  estimated_hours: null,
  has_pm: false,
  pm_required: false,
  is_historical: false,
  historical_notes: null,
  historical_start_date: null,
  invoice_balance_cents: null,
  invoice_due_date: null,
  invoice_last_synced_at: null,
  invoice_paid_at: null,
  invoice_sent_at: null,
  invoice_status: null,
  invoice_sync_error: null,
  primary_image_id: null,
  quickbooks_invoice_environment: null,
  quickbooks_invoice_id: null,
  quickbooks_invoice_number: null,
  quickbooks_realm_id: null,
  quickbooks_sync_excluded: false,
  updated_at: '2026-01-15T00:00:00Z',
};

const usePersona = (key: PersonaKey) => {
  const persona = personas[key];
  vi.mocked(useAuth).mockReturnValue(createMockAuthForPersona(persona));
  vi.mocked(useSession).mockReturnValue(createMockSessionForPersona(persona));
};

const renderTab = (equipmentRecord: Tables<'equipment'> = equipment) =>
  render(
    <EquipmentWorkOrdersTab
      equipmentId={equipmentRecord.id}
      organizationId="org-1"
      equipment={equipmentRecord}
    />,
  );

describe('EquipmentWorkOrdersTab permissions (#1729)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionEngine.clearCache();
    vi.mocked(useEquipmentWorkOrders).mockReturnValue({
      data: [workOrder],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isEnabled: true,
      refetch: vi.fn(),
    });
  });

  describe(`as ${personas.teamManager.name} (manager of the equipment's team)`, () => {
    beforeEach(() => usePersona('teamManager'));

    it('shows enabled edit and assign controls on the desktop card', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      renderTab();

      expect(screen.getByTestId('edit-control-wo-1')).toBeInTheDocument();
      expect(screen.getByTestId('assign-control-wo-1')).toHaveAttribute('data-disabled', 'false');
    });

    it('shows the edit control on the mobile card', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      renderTab();

      expect(screen.getByTestId('edit-control-wo-1')).toBeInTheDocument();
    });
  });

  describe(`as ${personas.teamManager.name} on another team's equipment`, () => {
    beforeEach(() => usePersona('teamManager'));

    it('does not show edit or assign controls', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      renderTab({ ...equipment, team_id: 'team-other' });

      expect(screen.queryByTestId('edit-control-wo-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('assign-control-wo-1')).toHaveAttribute('data-disabled', 'true');
    });
  });
});
