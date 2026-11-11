import { vi } from 'vitest';
import { createPreventativeMaintenanceFixture, createWorkOrderFixture } from '@/features/work-orders/utils/createWorkOrderFixture';
import { createMockSessionOrganization } from '@vitest-harness/mocks/testTypes';
import type { WorkOrder, WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';
import type { WorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import type * as useWorkOrderDetailsDataModule from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import type * as useWorkOrderDetailsActionsModule from '@/features/work-orders/hooks/useWorkOrderDetailsActions';

type WorkOrderDetailsData = ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>;
type WorkOrderDetailsPmData = NonNullable<WorkOrderDetailsData['pmData']>;

const defaultWorkOrder: WorkOrder = createWorkOrderFixture({ effectiveLocation: null });

const defaultEquipment: WorkOrderEmbeddedEquipment = {
  id: 'eq-1',
  organization_id: 'org-1',
  name: 'Excavator 1',
  manufacturer: 'Caterpillar',
  model: '320',
  serial_number: null,
  status: 'active',
  working_hours: null,
  image_url: null,
  location: null,
  team_id: 'team-1',
  customer_id: null,
  default_pm_template_id: null,
  custom_attributes: null,
  use_team_location: null,
  last_known_location: null,
  assigned_location_lat: null,
  assigned_location_lng: null,
  assigned_location_street: null,
  assigned_location_city: null,
  assigned_location_state: null,
  assigned_location_country: null,
  team: null,
};

const defaultPmData: WorkOrderDetailsPmData = createPreventativeMaintenanceFixture();

const defaultPermissionLevels: WorkOrderPermissionLevels = {
  isManager: false,
  isTechnician: false,
  isRequestor: true,
  canEdit: false,
  canDelete: false,
  canAssign: false,
  canChangeStatus: false,
  canAddNotes: false,
  canAddImages: false,
  exportAudience: 'none',
  getFormMode: () => 'requestor',
};

export const defaultWorkOrderDetailsDataMock = {
  workOrder: defaultWorkOrder,
  equipment: defaultEquipment,
  pmData: undefined,
  workOrderLoading: false,
  pmLoading: false,
  pmError: false,
  permissionLevels: defaultPermissionLevels,
  formMode: 'requestor' as const,
  isWorkOrderLocked: false,
  canAddCosts: false,
  canEditCosts: false,
  canViewWorkOrderCosts: false,
  canAddNotes: false,
  canUsePrivateNotes: false,
  canUpload: false,
  canEdit: false,
  baseCanAddNotes: false,
  currentOrganization: createMockSessionOrganization({ id: 'org-1', name: 'Test Org' }),
} satisfies Partial<WorkOrderDetailsData>;

export const defaultWorkOrderDetailsActionsMock = {
  isEditFormOpen: false,
  showMobileSidebar: false,
  setShowMobileSidebar: vi.fn(),
  handleEditWorkOrder: vi.fn(),
  handleCloseEditForm: vi.fn(),
  handleUpdateWorkOrder: vi.fn(),
  handleStatusUpdate: vi.fn(),
  handlePMUpdate: vi.fn(),
  showPMWarning: false,
  setShowPMWarning: vi.fn(),
  pmChangeType: 'disable' as const,
  handleConfirmPMChange: vi.fn(),
  handleCancelPMChange: vi.fn(),
  getPMDataDetails: () => ({ hasNotes: false, hasCompletedItems: false }),
  isUpdating: false,
} satisfies Partial<ReturnType<typeof useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions>>;

/**
 * Overrides accept partial work order / equipment / PM / permission objects;
 * the factories merge them onto complete typed defaults.
 */
export type WorkOrderDetailsDataMockOverrides = Omit<
  Partial<WorkOrderDetailsData>,
  'workOrder' | 'equipment' | 'pmData' | 'permissionLevels'
> & {
  workOrder?: Partial<WorkOrder>;
  equipment?: Partial<WorkOrderEmbeddedEquipment> | null;
  pmData?: Partial<WorkOrderDetailsPmData> | null;
  permissionLevels?: Partial<WorkOrderPermissionLevels>;
};

export function createWorkOrderDetailsDataMock(
  overrides: WorkOrderDetailsDataMockOverrides = {},
): WorkOrderDetailsData {
  const { workOrder, equipment, pmData, permissionLevels, ...rest } = overrides;
  return {
    ...defaultWorkOrderDetailsDataMock,
    ...rest,
    workOrder: {
      ...defaultWorkOrderDetailsDataMock.workOrder,
      ...workOrder,
    },
    equipment: equipment === undefined
      ? defaultWorkOrderDetailsDataMock.equipment
      : equipment === null
        ? undefined
        : { ...defaultEquipment, ...equipment },
    pmData: pmData === undefined || pmData === null
      ? defaultWorkOrderDetailsDataMock.pmData
      : { ...defaultPmData, ...pmData },
    permissionLevels: {
      ...defaultWorkOrderDetailsDataMock.permissionLevels,
      ...permissionLevels,
    },
    createdByCurrentUser: false,
  };
}

export function createManagerWorkOrderDetailsDataMock(
  overrides: WorkOrderDetailsDataMockOverrides = {},
): WorkOrderDetailsData {
  return createWorkOrderDetailsDataMock({
    permissionLevels: {
      isManager: true,
      isTechnician: true,
      isRequestor: false,
    },
    formMode: 'manager',
    isWorkOrderLocked: false,
    canAddCosts: true,
    canEditCosts: true,
    canViewWorkOrderCosts: true,
    canAddNotes: true,
    canUsePrivateNotes: true,
    canUpload: true,
    canEdit: true,
    baseCanAddNotes: true,
    currentOrganization: createMockSessionOrganization({ id: 'org-1', name: 'Test Org' }),
    ...overrides,
  });
}

export function createWorkOrderDetailsActionsMock(
  overrides: Partial<ReturnType<typeof useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions>> = {},
): ReturnType<typeof useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions> {
  return {
    ...defaultWorkOrderDetailsActionsMock,
    ...overrides,
  } as ReturnType<typeof useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions>;
}
