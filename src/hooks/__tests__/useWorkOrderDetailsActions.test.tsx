import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { QueryClient } from '@tanstack/react-query';
import { useWorkOrderDetailsActions } from '../useWorkOrderDetailsActions';
import type { WorkOrderFormData } from '@/schemas/workOrderSchema';
import type { PMChecklistItem } from '@/services/preventativeMaintenanceService';

// Mock dependencies
vi.mock('@/integrations/supabase/client', async () => {
  const { createMockSupabaseClient } = await import('@/test/utils/mock-supabase');
  return { supabase: createMockSupabaseClient() };
});

vi.mock('@/services/preventativeMaintenanceService', () => ({
  createPM: vi.fn(),
  updatePM: vi.fn(),
  deletePM: vi.fn(),
}));

vi.mock('@/services/pmChecklistTemplatesService', () => ({
  pmChecklistTemplatesService: {
    getTemplate: vi.fn(),
  },
}));

vi.mock('@/hooks/useWorkOrderUpdate', () => ({
  useUpdateWorkOrder: vi.fn(),
}));

// Import mocked modules for assertions
import { createPM } from '@/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/services/pmChecklistTemplatesService';
import { useUpdateWorkOrder } from '@/hooks/useWorkOrderUpdate';

// Mock checklist data
const mockChecklistData: PMChecklistItem[] = [
  {
    id: 'item-1',
    section: 'Engine',
    item: 'Check oil level',
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
  pmData?: { id?: string; equipment_id?: string; template_id?: string | null } | null;
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

  describe('PM Creation Equipment ID Prioritization', () => {
    it('should use data.equipmentId when both data.equipmentId and equipmentId parameter are present', async () => {
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null} // No existing PM
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      // Prepare form data with equipmentId
      const formData: WorkOrderFormData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: 'eq-from-form', // This should be prioritized
        priority: 'medium',
        hasPM: true,
        pmTemplateId: 'template-1',
      };

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
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null} // No existing PM
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      // Prepare form data without equipmentId (undefined, null, or empty string)
      const formData: WorkOrderFormData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: '', // Empty string - should fall back to parameter
        priority: 'medium',
        hasPM: true,
        pmTemplateId: 'template-1',
      };

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
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null} // No existing PM
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      // Prepare form data without equipmentId
      const formData: WorkOrderFormData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: '', // Empty string
        priority: 'medium',
        hasPM: true,
        pmTemplateId: 'template-1',
      };

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
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null}
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      // Create form data with null equipmentId (simulating form state)
      const formData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: null as unknown as string, // Explicitly null
        priority: 'medium' as const,
        hasPM: true,
        pmTemplateId: 'template-1',
      };

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
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null}
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      const formData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: undefined as unknown as string,
        priority: 'medium' as const,
        hasPM: true,
        pmTemplateId: 'template-1',
      };

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
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null}
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      const formData: WorkOrderFormData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: '', // Empty in form
        priority: 'medium',
        hasPM: true,
        pmTemplateId: 'template-1',
      };

      await capturedActions!.handleUpdateWorkOrder(
        formData,
        false,
        'eq-fallback' // Should use this
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
      let capturedActions: ReturnType<typeof useWorkOrderDetailsActions> | undefined;
      
      render(
        <TestComponent
          workOrderId="wo-1"
          organizationId="org-1"
          pmData={null}
          onReady={(actions) => { capturedActions = actions; }}
        />
      );

      await waitFor(() => {
        expect(capturedActions).toBeDefined();
      });

      const formData: WorkOrderFormData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipmentId: 'eq-1', // Present
        priority: 'medium',
        hasPM: true,
        pmTemplateId: null, // Missing template
      };

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

