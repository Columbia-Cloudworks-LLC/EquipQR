import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@/test/utils/test-utils';
import WorkOrderDetails from '../WorkOrderDetails';
import * as useWorkOrderDetailsDataModule from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import * as useWorkOrderDetailsActionsModule from '@/features/work-orders/hooks/useWorkOrderDetailsActions';

const mockWorkOrderDetailsMobile = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ workOrderId: 'wo-1' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => true),
}));

vi.mock('@/features/work-orders/components/hooks/useWorkOrderDetailsData', () => ({
  useWorkOrderDetailsData: vi.fn(),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderDetailsActions', () => ({
  useWorkOrderDetailsActions: vi.fn(),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderEquipment', () => ({
  useWorkOrderEquipment: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderData', () => ({
  useUpdateWorkOrderStatus: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderExcelExport', () => ({
  useWorkOrderExcelExport: vi.fn(() => ({ exportSingle: vi.fn(), isExportingSingle: false })),
}));

vi.mock('@/features/work-orders/hooks/useWorkTimer', () => ({
  useWorkTimer: vi.fn(() => ({
    elapsedSeconds: 0,
    displayTime: '0:00',
    stopAndGetHours: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    isRunning: false,
  })),
}));

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true, isSyncing: false })),
}));

vi.mock('@/hooks/useDocumentTitle', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('@/features/pm-templates/hooks/useInitializePMChecklist', () => ({
  useInitializePMChecklist: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPDFData', () => ({
  useWorkOrderPDF: vi.fn(() => ({
    downloadPDF: vi.fn(),
    isGenerating: false,
    saveToDrive: vi.fn(),
    isSavingToDrive: false,
  })),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: vi.fn(() => ({ isConnected: false })),
}));

vi.mock('@/utils/navigationDebug', () => ({
  logNavigationEvent: vi.fn(),
}));

vi.mock('@/components/audit', () => ({
  HistoryTab: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsInfo', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderTimeline', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderNotesSection', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderImagesSection', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/PMChecklistComponent', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderCostsSection', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderEquipmentSelector', () => ({
  WorkOrderEquipmentSelector: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsMobileHeader', () => ({
  WorkOrderDetailsMobileHeader: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsDesktopHeader', () => ({
  WorkOrderDetailsDesktopHeader: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsStatusLockWarning', () => ({
  WorkOrderDetailsStatusLockWarning: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsPMInfo', () => ({
  WorkOrderDetailsPMInfo: () => null,
}));

vi.mock('@/features/work-orders/components/PMChangeWarningDialog', () => ({
  PMChangeWarningDialog: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsSidebar', () => ({
  WorkOrderDetailsSidebar: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsMobile', () => ({
  WorkOrderDetailsMobile: (props: unknown) => {
    mockWorkOrderDetailsMobile(props);
    return <div data-testid="work-order-details-mobile" />;
  },
}));

vi.mock('@/features/work-orders/components/WorkOrderPDFExportDialog', () => ({
  WorkOrderPDFExportDialog: () => null,
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderActionSheet', () => ({
  MobileWorkOrderActionSheet: () => null,
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderInProgressBar', () => ({
  MobileWorkOrderInProgressBar: () => null,
}));

describe('WorkOrderDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWorkOrderDetailsDataModule.useWorkOrderDetailsData).mockReturnValue({
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
      formMode: 'requestor',
      isWorkOrderLocked: false,
      canAddCosts: false,
      canEditCosts: false,
      canAddNotes: false,
      canUpload: false,
      canEdit: false,
      baseCanAddNotes: false,
      currentOrganization: {
        id: 'org-1',
        name: 'Test Org',
      },
    } as unknown as ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>);

    vi.mocked(useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions).mockReturnValue({
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
    } as unknown as ReturnType<typeof useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions>);
  });

  it('does not pass a delete request handler to mobile details for non-managers', async () => {
    render(<WorkOrderDetails />);

    await waitFor(() => {
      expect(mockWorkOrderDetailsMobile).toHaveBeenCalled();
    });

    const latestProps = mockWorkOrderDetailsMobile.mock.calls.at(-1)?.[0] as {
      onDeleteRequest?: unknown;
    };

    expect(latestProps.onDeleteRequest).toBeUndefined();
  });
});
