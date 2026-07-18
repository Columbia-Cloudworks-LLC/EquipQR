import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@vitest-harness/utils/test-utils';
import { QueryClient } from '@tanstack/react-query';
import { useWorkOrderDetailsActions } from './useWorkOrderDetailsActions';
import type { WorkOrderFormData } from '@/features/work-orders/schemas/workOrderSchema';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

// Mock dependencies
vi.mock('@/integrations/supabase/client', async () => {
  const { createMockSupabaseClient } = await import('@vitest-harness/utils/mock-supabase');
  return { supabase: createMockSupabaseClient() };
});

vi.mock('@/features/pm-templates/services/preventativeMaintenanceService', () => ({
  createPM: vi.fn(),
  updatePM: vi.fn(),
  deletePM: vi.fn(),
}));

vi.mock('@/features/pm-templates/services/pmChecklistTemplatesService', () => ({
  pmChecklistTemplatesService: {
    getTemplate: vi.fn(),
  },
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderUpdate', () => ({
  useUpdateWorkOrder: vi.fn(),
}));

// Import mocked modules for assertions
import { createPM, updatePM, deletePM } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { useUpdateWorkOrder } from '@/features/work-orders/hooks/useWorkOrderUpdate';

// Mock checklist data
const mockChecklistData: PMChecklistItem[] = [
  {
    id: 'item-1',
    section: 'Engine',
    title: 'Check oil level',
    required: true,
    condition: null,
    notes: '',
  },
];

// Mock PM template
const mockPMTemplate = {
  id: 'template-1',
  name: 'Test Template',
  template_data: mockChecklistData,
};

interface TestComponentProps {
  workOrderId: string;
  organizationId: string;
  pmData?: {
    id?: string;
    equipment_id?: string;
    template_id?: string | null;
    checklist_data?: unknown[];
    notes?: string;
  } | null;
  onReady?: (actions: ReturnType<typeof useWorkOrderDetailsActions>) => void;
}

const TestComponent = ({ workOrderId, organizationId, pmData, onReady }: TestComponentProps) => {
  const actions = useWorkOrderDetailsActions(workOrderId, organizationId, pmData);
  
  React.useEffect(() => {
    if (onReady) {
      onReady(actions);
    }
  }, [actions, onReady]);

  return (
    <div>
      <div data-testid="is-edit-open">{actions.isEditFormOpen.toString()}</div>
      <div data-testid="is-updating">{actions.isUpdating.toString()}</div>
    </div>
  );
};

describe('useWorkOrderDetailsActions - Equipment ID Prioritization', () => {
  let invalidateSpy: ReturnType<typeof vi.spyOn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    
    // Mock useUpdateWorkOrder to return a mutation with mutateAsync
    mockMutateAsync = vi.fn().mockResolvedValue({ id: 'wo-1', title: 'Updated Work Order' });
    vi.mocked(useUpdateWorkOrder).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateWorkOrder>);

    // Mock pmChecklistTemplatesService.getTemplate
    vi.mocked(pmChecklistTemplatesService.getTemplate).mockResolvedValue(mockPMTemplate);

    // Mock createPM to return a successful PM record
    vi.mocked(createPM).mockResolvedValue({
      id: 'pm-1',
      work_order_id: 'wo-1',
      equipment_id: 'eq-1',
      organization_id: 'org-1',
      status: 'pending',
    } as unknown as ReturnType<typeof createPM>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    invalidateSpy.mockRestore();
  });

  type PmFormDataOverrides = Partial<
    Omit<WorkOrderFormData, 'equipmentId'> & { equipmentId?: string | null }
  >;

  const buildPmFormData = (
    overrides: PmFormDataOverrides = {},
  ): Omit<WorkOrderFormData, 'equipmentId'> & { equipmentId?: string | null } => ({
    title: 'Test Work Order',
    description: 'Test Description',
    priority: 'medium',
    hasPM: true,
    pmTemplateId: 'template-1',
    ...overrides,
  });

  async function renderActionsHarness(
    pmData: TestComponentProps['pmData'] = null,
  ) {
    let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;

    render(
      <TestComponent
        workOrderId="wo-1"
        organizationId="org-1"
        pmData={pmData}
        onReady={(actions) => {
          capturedActions = actions;
        }}
      />,
    );

    await waitFor(() => {
      expect(capturedActions).toBeDefined();
    });

    return capturedActions!;
  }

  describe('PM Creation Equipment ID Prioritization', () => {
    it('should use data.equipmentId when both data.equipmentId and equipmentId parameter are present', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData({
        equipmentId: 'eq-from-form',
      }) as WorkOrderFormData;

      // Call handleUpdateWorkOrder with both data.equipmentId and equipmentId parameter
      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false, // originalHasPM = false (PM is being enabled)
        'eq-from-parameter' // This should be ignored
      );

      // Wait for async operations to complete
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify createPM was called with data.equipmentId (prioritized)
      expect(createPM).toHaveBeenCalledWith(
        expect.objectContaining({
          workOrderId: 'wo-1',
          equipmentId: 'eq-from-form', // Should use form's equipmentId
          organizationId: 'org-1',
          templateId: 'template-1',
        })
      );

      // Verify getTemplateChecklistData was called
      expect(pmChecklistTemplatesService.getTemplate).toHaveBeenCalledWith('template-1');
    });

    it('should fall back to equipmentId parameter when data.equipmentId is unavailable', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData();

      // Call handleUpdateWorkOrder with only equipmentId parameter
      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false, // originalHasPM = false (PM is being enabled)
        'eq-from-parameter' // This should be used as fallback
      );

      // Wait for async operations to complete
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify createPM was called with equipmentId parameter (fallback)
      expect(createPM).toHaveBeenCalledWith(
        expect.objectContaining({
          workOrderId: 'wo-1',
          equipmentId: 'eq-from-parameter', // Should use parameter as fallback
          organizationId: 'org-1',
          templateId: 'template-1',
        })
      );
    });

    it('should skip PM creation when both data.equipmentId and equipmentId parameter are nullish', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData();

      // Call handleUpdateWorkOrder without equipmentId parameter
      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false, // originalHasPM = false (PM is being enabled)
        undefined // No equipmentId parameter
      );

      // Wait for async operations to complete
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify createPM was NOT called (both values are nullish)
      expect(createPM).not.toHaveBeenCalled();

      // Verify getTemplateChecklistData was NOT called (PM creation was skipped)
      expect(pmChecklistTemplatesService.getTemplate).not.toHaveBeenCalled();
    });

    it('should skip PM creation when data.equipmentId is null and equipmentId parameter is undefined', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData({ equipmentId: null });

      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false,
        undefined
      );

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify createPM was NOT called
      expect(createPM).not.toHaveBeenCalled();
    });

    it('should skip PM creation when data.equipmentId is undefined and equipmentId parameter is empty string', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData();

      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false,
        '' // Empty string parameter
      );

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify createPM was NOT called (both are falsy)
      expect(createPM).not.toHaveBeenCalled();
    });
  });

  describe('PM Creation Edge Cases', () => {
    it('should handle PM creation when pmTemplateId is provided but equipmentId comes from parameter', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData();

      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false,
        'eq-fallback' // Should use this since form equipmentId is omitted
      );

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      expect(createPM).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'eq-fallback',
          templateId: 'template-1',
        })
      );
    });

    it('should not create PM when pmTemplateId is missing even if equipmentId is present', async () => {
      const capturedActions = await renderActionsHarness();

      const formData = buildPmFormData({
        equipmentId: 'eq-1',
        pmTemplateId: null,
      }) as WorkOrderFormData;

      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false,
        'eq-1'
      );

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Should not create PM because pmTemplateId is null
      // The condition is: pmBeingEnabled && data.pmTemplateId
      expect(createPM).not.toHaveBeenCalled();
    });
  });
});

describe('useWorkOrderDetailsActions - PM template management', () => {
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync = vi.fn().mockResolvedValue({ id: 'wo-1', title: 'Updated Work Order' });
    vi.mocked(useUpdateWorkOrder).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateWorkOrder>);
    vi.mocked(pmChecklistTemplatesService.getTemplate).mockResolvedValue(mockPMTemplate);
    vi.mocked(createPM).mockResolvedValue({ id: 'pm-new' } as Awaited<ReturnType<typeof createPM>>);
    vi.mocked(updatePM).mockResolvedValue({ id: 'pm-1' } as Awaited<ReturnType<typeof updatePM>>);
    vi.mocked(deletePM).mockResolvedValue(true);
  });

  type PmFormDataOverrides = Partial<
    Omit<WorkOrderFormData, 'equipmentId'> & { equipmentId?: string | null }
  >;

  const buildPmFormData = (
    overrides: PmFormDataOverrides = {},
  ): Omit<WorkOrderFormData, 'equipmentId'> & { equipmentId?: string | null } => ({
    title: 'Test Work Order',
    description: 'Test Description',
    priority: 'medium',
    hasPM: true,
    pmTemplateId: 'template-2',
    ...overrides,
  });

  async function renderActionsHarness(
    pmData: TestComponentProps['pmData'] = null,
  ) {
    let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;

    render(
      <TestComponent
        workOrderId="wo-1"
        organizationId="org-1"
        pmData={pmData}
        onReady={(actions) => {
          capturedActions = actions;
        }}
      />,
    );

    await waitFor(() => {
      expect(capturedActions).toBeDefined();
    });

    return capturedActions!;
  }

  it('adds PM to an active work order without an existing PM row', async () => {
    const capturedActions = await renderActionsHarness(null);
    const formData = buildPmFormData({ equipmentId: 'eq-1' }) as WorkOrderFormData;

    await capturedActions.handleUpdateWorkOrder(formData, false, 'eq-1');

    await waitFor(() => {
      expect(createPM).toHaveBeenCalledWith(
        expect.objectContaining({
          workOrderId: 'wo-1',
          equipmentId: 'eq-1',
          templateId: 'template-2',
        }),
      );
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hasPM: true }),
        }),
      );
    });
  });

  it('changes PM template and resets PM checklist data only', async () => {
    const capturedActions = await renderActionsHarness({
      id: 'pm-1',
      equipment_id: 'eq-1',
      template_id: 'template-1',
    });

    const formData = buildPmFormData({
      equipmentId: 'eq-1',
      pmTemplateId: 'template-2',
    }) as WorkOrderFormData;

    await capturedActions.handleUpdateWorkOrder(formData, true, 'eq-1');

    await waitFor(() => {
      expect(updatePM).toHaveBeenCalledWith(
        'pm-1',
        expect.objectContaining({
          templateId: 'template-2',
          status: 'pending',
          completedAt: null,
          completedBy: null,
        }),
        'org-1',
      );
      expect(deletePM).not.toHaveBeenCalled();
    });
  });

  it('removes PM from an active work order while preserving work-order fields', async () => {
    const capturedActions = await renderActionsHarness({
      id: 'pm-1',
      equipment_id: 'eq-1',
      template_id: 'template-1',
    });

    const formData = buildPmFormData({
      hasPM: false,
      pmTemplateId: null,
      equipmentId: 'eq-1',
    }) as WorkOrderFormData;

    await capturedActions.handleUpdateWorkOrder(formData, true, 'eq-1');

    await waitFor(() => {
      expect(deletePM).toHaveBeenCalledWith('pm-1', 'org-1');
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Work Order',
            description: 'Test Description',
            hasPM: false,
          }),
        }),
      );
    });
  });

  it('returns confirmation_required when changing template on PM with meaningful data', async () => {
    const capturedActions = await renderActionsHarness({
      id: 'pm-1',
      equipment_id: 'eq-1',
      template_id: 'template-1',
      checklist_data: [{ id: 'item-1', condition: 'good' }],
    });

    const formData = buildPmFormData({
      equipmentId: 'eq-1',
      pmTemplateId: 'template-2',
    }) as WorkOrderFormData;

    const outcome = await capturedActions.handleUpdateWorkOrder(formData, true, 'eq-1');

    expect(outcome).toBe('confirmation_required');
    expect(updatePM).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('returns completed after confirming a deferred PM template change', async () => {
    const capturedActions = await renderActionsHarness({
      id: 'pm-1',
      equipment_id: 'eq-1',
      template_id: 'template-1',
      checklist_data: [{ id: 'item-1', condition: 'good' }],
    });

    const formData = buildPmFormData({
      equipmentId: 'eq-1',
      pmTemplateId: 'template-2',
    }) as WorkOrderFormData;

    await capturedActions.handleUpdateWorkOrder(formData, true, 'eq-1');
    await capturedActions.handleConfirmPMChange();

    await waitFor(() => {
      expect(updatePM).toHaveBeenCalled();
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});

describe('useWorkOrderDetailsActions - handleStatusUpdate cache refresh (#1278)', () => {
  let invalidateSpy: ReturnType<typeof vi.spyOn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    mockMutateAsync = vi.fn().mockResolvedValue({ id: 'wo-1' });
    vi.mocked(useUpdateWorkOrder).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateWorkOrder>);
  });

  afterEach(() => {
    invalidateSpy.mockRestore();
  });

  it('invalidates workOrderKeys.detail so Revert to Accepted refreshes the details page', async () => {
    let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;

    render(
      <TestComponent
        workOrderId="wo-1"
        organizationId="org-1"
        pmData={null}
        onReady={(actions) => {
          capturedActions = actions;
        }}
      />,
    );

    await waitFor(() => {
      expect(capturedActions).toBeDefined();
    });

    invalidateSpy.mockClear();
    capturedActions!.handleStatusUpdate();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['work-orders', 'detail', 'org-1', 'wo-1'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['work-orders', 'list'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['preventativeMaintenance', 'wo-1'],
    });
  });
});

