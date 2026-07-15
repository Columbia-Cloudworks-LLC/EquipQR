import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import WorkOrderDetails from '../WorkOrderDetails';
import * as useWorkOrderDetailsDataModule from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import * as useWorkOrderDetailsActionsModule from '@/features/work-orders/hooks/useWorkOrderDetailsActions';
import {
  createWorkOrderDetailsActionsMock,
  createWorkOrderDetailsDataMock,
  createManagerWorkOrderDetailsDataMock,
} from './workOrderDetailsTestFixtures';

const mockWorkOrderDetailsMobile = vi.fn();

const {
  mockUseIsMobile,
  mockWorkOrderImagesSectionProps,
  mockWorkOrderNotesSectionProps,
  mockSetSearchParams,
  mockUseSearchParams,
  mockMobileWorkOrderActionFooterProps,
} = vi.hoisted(() => {
  const mockSetSearchParamsInner = vi.fn();
  const mockUseSearchParamsInner = vi.fn(() => [new URLSearchParams(), mockSetSearchParamsInner]);
  return {
    mockUseIsMobile: vi.fn(() => true),
    mockWorkOrderImagesSectionProps: vi.fn(),
    mockWorkOrderNotesSectionProps: vi.fn(),
    mockSetSearchParams: mockSetSearchParamsInner,
    mockUseSearchParams: mockUseSearchParamsInner,
    mockMobileWorkOrderActionFooterProps: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ workOrderId: 'wo-1' }),
    useSearchParams: () => mockUseSearchParams(),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
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

vi.mock('@/features/work-orders/hooks/useWorkOrderStatusUpdate', () => ({
  useWorkOrderStatusUpdate: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderAcceptance', () => ({
  useWorkOrderAcceptance: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}));

vi.mock('@/features/work-orders/components/WorkOrderAcceptanceModal', () => ({
  default: () => null,
}));

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueue: vi.fn(() => ({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    retryFailed: vi.fn(),
  })),
  useOfflineQueueOptional: vi.fn(() => undefined),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderInlineFieldSave', () => ({
  useWorkOrderInlineFieldSave: vi.fn(() => ({
    saveField: vi.fn(),
    isSaving: false,
  })),
}));

vi.mock('@/hooks/useQuickWorkOrderAssignment', () => ({
  useQuickWorkOrderAssignment: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', email: 'tech@example.com' } })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderExcelExport', () => ({
  useWorkOrderExcelExport: vi.fn(() => ({
    exportSingle: vi.fn(),
    isExportingSingle: false,
    exportSingleToDocs: vi.fn(),
    isExportingSingleToDocs: false,
  })),
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
    downloadFieldWorksheet: vi.fn(),
    isGeneratingWorksheet: false,
  })),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: vi.fn(() => ({ isConnected: false })),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceExportDestination', () => ({
  useGoogleWorkspaceExportDestination: vi.fn(() => ({ destination: null })),
}));

vi.mock('@/utils/navigationDebug', () => ({
  logNavigationEvent: vi.fn(),
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsInfo', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderTimeline', () => ({
  default: () => <div>Timeline section</div>,
}));

vi.mock('@/features/work-orders/components/WorkOrderNotesSection', () => ({
  default: (props: Record<string, unknown>) => {
    mockWorkOrderNotesSectionProps(props);
    return <div>Notes section</div>;
  },
}));

vi.mock('@/features/work-orders/components/WorkOrderImagesSection', () => ({
  default: (props: Record<string, unknown>) => {
    mockWorkOrderImagesSectionProps(props);
    return <div>Images section</div>;
  },
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/PMChecklistComponent', () => ({
  default: () => <div>PM checklist</div>,
}));

vi.mock('@/features/work-orders/components/WorkOrderCostsSection', () => ({
  default: () => <div>Costs section</div>,
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
  WorkOrderDetailsPMInfo: () => <div>PM info</div>,
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
    return <div data-testid="work-order-details-mobile">Job card</div>;
  },
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderCompactSummary', () => ({
  MobileWorkOrderCompactSummary: () => <div>Compact summary</div>,
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderFieldNextAction', () => ({
  MobileWorkOrderFieldNextAction: () => <div>Next action</div>,
}));

vi.mock('@/features/work-orders/components/WorkOrderPDFExportDialog', () => ({
  WorkOrderPDFExportDialog: () => null,
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderActionSheet', () => ({
  MobileWorkOrderActionSheet: () => null,
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderActionFooter', () => ({
  MobileWorkOrderActionFooter: (props: Record<string, unknown>) => {
    mockMobileWorkOrderActionFooterProps(props);
    return <div data-testid="mobile-work-order-action-footer-marker">Mobile action footer</div>;
  },
}));

describe('WorkOrderDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMobileWorkOrderActionFooterProps.mockClear();
    mockWorkOrderNotesSectionProps.mockClear();
    mockUseIsMobile.mockReturnValue(true);
    mockSetSearchParams.mockReset();
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);

    vi.mocked(useWorkOrderDetailsDataModule.useWorkOrderDetailsData).mockReturnValue(
      createWorkOrderDetailsDataMock(),
    );

    vi.mocked(useWorkOrderDetailsActionsModule.useWorkOrderDetailsActions).mockReturnValue(
      createWorkOrderDetailsActionsMock(),
    );
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

    await waitFor(() => {
      expect(screen.getByText('Next action')).toBeInTheDocument();
    });
  });

  it('shows mobile action footer with onAddNote for submitted work orders created by current user (suppresses Next action)', async () => {
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
        created_by: 'user-1',
        organization_id: 'org-1',
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
      canAddNotes: true,
      canUpload: false,
      canEdit: false,
      baseCanAddNotes: true,
      currentOrganization: {
        id: 'org-1',
        name: 'Test Org',
      },
    } as unknown as ReturnType<typeof useWorkOrderDetailsDataModule.useWorkOrderDetailsData>);

    render(<WorkOrderDetails />);

    await waitFor(() => {
      expect(mockMobileWorkOrderActionFooterProps).toHaveBeenCalled();
    });

    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-work-order-action-footer-marker')).toBeInTheDocument();

    const footerProps = mockMobileWorkOrderActionFooterProps.mock.calls.at(-1)?.[0] as {
      workOrder: { status: string };
      syncState: { isOnline: boolean };
    };
    expect(footerProps.workOrder.status).toBe('submitted');
    expect(footerProps.syncState.isOnline).toBe(true);

    await waitFor(() => {
      expect(mockWorkOrderNotesSectionProps).toHaveBeenCalled();
    });
    const notesProps = mockWorkOrderNotesSectionProps.mock.calls.at(-1)?.[0] as {
      canAddNotes?: boolean;
      hideInlineAddButton?: boolean;
    };
    expect(notesProps.canAddNotes).toBe(true);
    expect(notesProps.hideInlineAddButton).toBe(true);
  });

  it('renders the mobile field-first order with office details collapsed by default', async () => {
    vi.mocked(useWorkOrderDetailsDataModule.useWorkOrderDetailsData).mockReturnValue(
      createManagerWorkOrderDetailsDataMock({
        workOrder: {
          status: 'in_progress',
          priority: 'high',
          updated_at: '2024-01-02T00:00:00Z',
          dueDate: '2024-01-05T00:00:00Z',
          has_pm: true,
          assignee_id: 'user-1',
          created_by: 'requestor-1',
          teamName: 'Field Team',
          assigneeName: 'Matt Technician',
          team: null,
          assignee: null,
          primary_image_id: 'primary-img-1',
        },
        pmData: {
          id: 'pm-1',
          work_order_id: 'wo-1',
          equipment_id: 'eq-1',
          status: 'in_progress',
          checklist_data: [
            { id: 'item-1', condition: 'ok' },
            { id: 'item-2', condition: null },
          ],
        },
      }),
    );

    render(<WorkOrderDetails />);

    expect(screen.queryByText('Next action')).not.toBeInTheDocument();

    const pageText = document.body.textContent ?? '';
    expect(pageText.indexOf('Compact summary')).toBeLessThan(pageText.indexOf('Job card'));
    expect(pageText.indexOf('Job card')).toBeLessThan(pageText.indexOf('PM checklist'));
    expect(pageText.indexOf('Images section')).toBeLessThan(pageText.indexOf('Notes section'));
    expect(pageText.indexOf('Notes section')).toBeLessThan(pageText.indexOf('Costs section'));
    expect(pageText.indexOf('Costs section')).toBeLessThan(pageText.indexOf('Timeline & office details'));

    // Itemized costs stay outside Review/office so techs can reach them without expanding.
    expect(screen.getByText('Costs section')).toBeInTheDocument();
    expect(screen.queryByText('Timeline section')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /view field change history in the audit log/i }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockWorkOrderNotesSectionProps).toHaveBeenCalled();
    });
    const notesProps = mockWorkOrderNotesSectionProps.mock.calls.at(-1)?.[0] as {
      hideInlineAddButton?: boolean;
    };
    expect(notesProps.hideInlineAddButton).toBe(true);

    await waitFor(() => {
      expect(mockWorkOrderImagesSectionProps).toHaveBeenCalled();
    });
    const imageSectionProps = mockWorkOrderImagesSectionProps.mock.calls.at(-1)?.[0] as {
      showPrivateNotes?: boolean;
      workOrderId?: string;
      primaryImageId?: string | null;
    };
    expect(imageSectionProps?.workOrderId).toBe('wo-1');
    expect(imageSectionProps?.showPrivateNotes).toBe(true);
    expect(imageSectionProps?.primaryImageId).toBe('primary-img-1');

    await userEvent.click(screen.getByRole('button', { name: /timeline & office details/i }));

    expect(screen.getByText('Costs section')).toBeInTheDocument();
    expect(screen.getByText('PM info')).toBeInTheDocument();
    expect(screen.getByText('Timeline section')).toBeInTheDocument();
    // Embedded audit history was removed (#1122); managers get a deep link instead.
    expect(
      screen.getByRole('link', { name: /view field change history in the audit log/i }),
    ).toBeInTheDocument();
  });

  it('renders desktop layout with images before notes and passes showPrivateNotes to WorkOrderImagesSection', async () => {
    mockUseIsMobile.mockReturnValue(false);

    vi.mocked(useWorkOrderDetailsDataModule.useWorkOrderDetailsData).mockReturnValue(
      createManagerWorkOrderDetailsDataMock({
        workOrder: {
          status: 'in_progress',
          priority: 'high',
          updated_at: '2024-01-02T00:00:00Z',
          dueDate: '2024-01-05T00:00:00Z',
          has_pm: false,
          assignee_id: 'user-1',
          created_by: 'requestor-1',
          teamName: 'Field Team',
          assigneeName: 'Matt Technician',
          team: null,
          assignee: null,
          primary_image_id: 'primary-desktop-1',
        },
        pmData: null,
      }),
    );

    render(<WorkOrderDetails />);

    const pageText = document.body.textContent ?? '';
    expect(pageText.indexOf('Images section')).toBeLessThan(pageText.indexOf('Notes section'));

    await waitFor(() => {
      expect(mockWorkOrderImagesSectionProps).toHaveBeenCalled();
    });
    const props = mockWorkOrderImagesSectionProps.mock.calls.at(-1)?.[0] as {
      showPrivateNotes?: boolean;
      primaryImageId?: string | null;
    };
    expect(props?.showPrivateNotes).toBe(true);
    expect(props?.primaryImageId).toBe('primary-desktop-1');
  });

  it('scrolls to PM checklist and clears only action=pm on mobile', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    mockUseSearchParams.mockReturnValue([new URLSearchParams('action=pm'), mockSetSearchParams]);

    vi.mocked(useWorkOrderDetailsDataModule.useWorkOrderDetailsData).mockReturnValue(
      createManagerWorkOrderDetailsDataMock({
        workOrder: {
          title: 'PM job',
          description: 'PM',
          status: 'in_progress',
          priority: 'high',
          updated_at: '2024-01-02T00:00:00Z',
          dueDate: null,
          has_pm: true,
          teamName: null,
          assigneeName: null,
          primary_image_id: null,
        },
        equipment: {
          manufacturer: 'Cat',
        },
        pmData: {
          id: 'pm-1',
          work_order_id: 'wo-1',
          equipment_id: 'eq-1',
          status: 'in_progress',
          checklist_data: [],
        },
      }),
    );

    render(<WorkOrderDetails />);

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
    expect(screen.getByText('PM checklist')).toBeInTheDocument();

    expect(mockSetSearchParams).toHaveBeenCalled();
    const setCall = mockSetSearchParams.mock.calls.find((c) => typeof c[0] === 'function');
    expect(setCall).toBeDefined();
    const updater = setCall![0] as (prev: URLSearchParams) => URLSearchParams;
    const next = updater(new URLSearchParams('action=pm&keep=1'));
    expect(next.get('action')).toBeNull();
    expect(next.get('keep')).toBe('1');

    scrollSpy.mockRestore();
  });

  it('scrolls to PM checklist on desktop when action=pm', async () => {
    mockUseIsMobile.mockReturnValue(false);
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    mockUseSearchParams.mockReturnValue([new URLSearchParams('action=pm'), mockSetSearchParams]);

    vi.mocked(useWorkOrderDetailsDataModule.useWorkOrderDetailsData).mockReturnValue(
      createManagerWorkOrderDetailsDataMock({
        workOrder: {
          title: 'PM job',
          description: 'PM',
          status: 'in_progress',
          priority: 'high',
          updated_at: '2024-01-02T00:00:00Z',
          dueDate: null,
          has_pm: true,
          teamName: null,
          assigneeName: null,
          primary_image_id: null,
        },
        equipment: {
          manufacturer: 'Cat',
        },
        pmData: {
          id: 'pm-1',
          work_order_id: 'wo-1',
          equipment_id: 'eq-1',
          status: 'in_progress',
          checklist_data: [],
        },
      }),
    );

    render(<WorkOrderDetails />);

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
    expect(screen.getByText('PM checklist')).toBeInTheDocument();

    scrollSpy.mockRestore();
  });
});
