import { vi } from 'vitest';
import type * as useWorkOrderDetailsDataModule from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import type * as useWorkOrderDetailsActionsModule from '@/features/work-orders/hooks/useWorkOrderDetailsActions';

export const defaultWorkOrderDetailsDataMock = {
  workOrder: {
    id: 'wo-1',
    title: 'Replace hydraulic line',
    description: 'Repair leak',
    status: 'submitted',
    priority: 'medium',
    created_date: '2024-01-01T00:00:00Z',
    createdDate: '2024-01-01T00:00:00Z',
    dueDate: null,
    equipment_id: 'eq-1',
    has_pm: false,
    teamName: null,
    assigneeName: null,
    effectiveLocation: null,
  },
  equipment: {
    id: 'eq-1',
    name: 'Excavator 1',
    manufacturer: 'Caterpillar',
    model: '320',
    serial_number: null,
    status: 'active',
    location: null,
    team_id: 'team-1',
    custom_attributes: null,
    image_url: null,
    default_pm_template_id: null,
  },
  pmData: null,
  workOrderLoading: false,
  pmLoading: false,
  pmError: null,
  permissionLevels: {
    isManager: false,
    isTechnician: false,
    isRequestor: true,
  },
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
  currentOrganization: {
    id: 'org-1',
    name: 'Test Org',
  },
} satisfies Partial<ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>>;

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
  pmChangeType: null,
  handleConfirmPMChange: vi.fn(),
  handleCancelPMChange: vi.fn(),
  getPMDataDetails: () => ({ hasNotes: false, hasCompletedItems: false }),
  isUpdating: false,
} satisfies Partial<ReturnType<typeof useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions>>;

export function createWorkOrderDetailsDataMock(
  overrides: Partial<ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>> = {},
): ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData> {
  return {
    ...defaultWorkOrderDetailsDataMock,
    ...overrides,
    workOrder: {
      ...defaultWorkOrderDetailsDataMock.workOrder,
      ...(overrides.workOrder ?? {}),
    },
    equipment: overrides.equipment === undefined
      ? defaultWorkOrderDetailsDataMock.equipment
      : overrides.equipment,
    pmData: overrides.pmData === undefined
      ? defaultWorkOrderDetailsDataMock.pmData
      : overrides.pmData,
    permissionLevels: {
      ...defaultWorkOrderDetailsDataMock.permissionLevels,
      ...(overrides.permissionLevels ?? {}),
    },
  } as ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>;
}

export function createManagerWorkOrderDetailsDataMock(
  overrides: Partial<ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>> = {},
): ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData> {
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
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
    },
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
