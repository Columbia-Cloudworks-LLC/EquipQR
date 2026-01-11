import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWorkOrderPMChecklist } from '../useWorkOrderPMChecklist';

// Mock Supabase client first (before any imports that might use it)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null }))
    }))
  }
}));

// Mock dependencies
vi.mock('@/features/pm-templates/hooks/usePMTemplates');
vi.mock('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  useMatchingPMTemplates: vi.fn()
}));

const mockTemplates = [
  {
    id: 'template-1',
    name: 'Forklift PM',
    description: 'Default forklift template',
    organization_id: null,
    is_protected: true,
    sections: [{ name: 'Engine', count: 2 }],
    itemCount: 2
  },
  {
    id: 'template-2',
    name: 'Custom Template',
    description: 'Organization template',
    organization_id: 'org-1',
    is_protected: false,
    sections: [{ name: 'Safety', count: 1 }],
    itemCount: 1
  },
  {
    id: 'template-3',
    name: 'Another Global',
    description: 'Another global template',
    organization_id: null,
    is_protected: true,
    sections: [{ name: 'Hydraulics', count: 3 }],
    itemCount: 3
  }
];

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useWorkOrderPMChecklist', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { usePMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplates');
    const { useSimplifiedOrganizationRestrictions } = await import('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
    const { useMatchingPMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplateCompatibility');
    
    vi.mocked(usePMTemplates).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      status: 'success',
      fetchStatus: 'idle'
    } as ReturnType<typeof usePMTemplates>);
    
    // Mock useMatchingPMTemplates to return all templates as matching by default
    vi.mocked(useMatchingPMTemplates).mockReturnValue({
      data: mockTemplates.map(t => ({ template_id: t.id, match_type: 'manufacturer' as const })),
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPlaceholderData: false,
      isRefetchError: false,
      promise: Promise.resolve([])
    } as unknown as ReturnType<typeof useMatchingPMTemplates>);
    
    vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
      restrictions: {
        canCreateCustomPMTemplates: true,
        canAddMembers: true,
        canAccessAdvancedAnalytics: true,
        canAccessFleetMap: true,
        upgradeMessage: ''
      },
      checkRestriction: vi.fn(),
      getRestrictionMessage: vi.fn(),
      isSingleUser: false,
      canUpgrade: true,
      isLoading: false
    });
  });

  describe('template filtering', () => {
    it('returns all templates when user has custom PM template permissions', async () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      expect(result.current.templates).toHaveLength(3);
      expect(result.current.templates.map(t => t.id)).toContain('template-1');
      expect(result.current.templates.map(t => t.id)).toContain('template-2');
      expect(result.current.templates.map(t => t.id)).toContain('template-3');
    });

    it('returns only global templates when user lacks custom PM template permissions', async () => {
      const { useSimplifiedOrganizationRestrictions } = await import('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
      
      vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
        restrictions: {
          canCreateCustomPMTemplates: false,
          canAddMembers: true,
          canAccessAdvancedAnalytics: false,
          canAccessFleetMap: false,
          upgradeMessage: 'Upgrade for more features'
        },
        checkRestriction: vi.fn(),
        getRestrictionMessage: vi.fn(),
        isSingleUser: true,
        canUpgrade: true,
        isLoading: false
      });

      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      // Should only have global templates (organization_id is null)
      expect(result.current.templates).toHaveLength(2);
      expect(result.current.templates.every(t => t.organization_id === null)).toBe(true);
      expect(result.current.templates.map(t => t.id)).toContain('template-1');
      expect(result.current.templates.map(t => t.id)).toContain('template-3');
      expect(result.current.templates.map(t => t.id)).not.toContain('template-2');
    });

    it('returns empty templates array when equipment has assigned template', () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: undefined },
          setValue,
          selectedEquipment: {
            id: 'equipment-1',
            name: 'Test Equipment',
            default_pm_template_id: 'template-1'
          }
        }),
        { wrapper }
      );

      expect(result.current.templates).toHaveLength(0);
      expect(result.current.hasAssignedTemplate).toBe('template-1');
    });
  });

  describe('assigned template selection', () => {
    it('properly selects assigned template when equipment has default template', () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: undefined },
          setValue,
          selectedEquipment: {
            id: 'equipment-1',
            name: 'Test Equipment',
            default_pm_template_id: 'template-1'
          }
        }),
        { wrapper }
      );

      expect(result.current.hasAssignedTemplate).toBe('template-1');
      expect(result.current.assignedTemplate?.id).toBe('template-1');
      expect(result.current.selectedTemplate?.id).toBe('template-1');
    });

    it('auto-sets template ID when hasPM is true and equipment has assigned template', () => {
      const setValue = vi.fn();
      renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: undefined },
          setValue,
          selectedEquipment: {
            id: 'equipment-1',
            name: 'Test Equipment',
            default_pm_template_id: 'template-1'
          }
        }),
        { wrapper }
      );

      // useEffect should auto-set the template ID
      expect(setValue).toHaveBeenCalledWith('pmTemplateId', 'template-1');
    });

    it('does not auto-set template ID when hasPM is false', () => {
      const setValue = vi.fn();
      renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: {
            id: 'equipment-1',
            name: 'Test Equipment',
            default_pm_template_id: 'template-1'
          }
        }),
        { wrapper }
      );

      // Should not auto-set when hasPM is false
      expect(setValue).not.toHaveBeenCalled();
    });
  });

  describe('edit mode template preservation', () => {
    it('correctly preserves current template selection in edit mode', async () => {
      const { useSimplifiedOrganizationRestrictions } = await import('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
      
      // Simulate free user without custom PM template permissions
      vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
        restrictions: {
          canCreateCustomPMTemplates: false,
          canAddMembers: true,
          canAccessAdvancedAnalytics: false,
          canAccessFleetMap: false,
          upgradeMessage: 'Upgrade for more features'
        },
        checkRestriction: vi.fn(),
        getRestrictionMessage: vi.fn(),
        isSingleUser: true,
        canUpgrade: true,
        isLoading: false
      });

      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: 'template-2' }, // Organization template in edit mode
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      // Template-2 is an org template, but should still be available in edit mode
      // because the work order already has it selected
      expect(result.current.templates.map(t => t.id)).toContain('template-2');
      expect(result.current.selectedTemplate?.id).toBe('template-2');
    });

    it('includes template from values even when filtered out by restrictions', async () => {
      const { useSimplifiedOrganizationRestrictions } = await import('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
      
      vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
        restrictions: {
          canCreateCustomPMTemplates: false,
          canAddMembers: true,
          canAccessAdvancedAnalytics: false,
          canAccessFleetMap: false,
          upgradeMessage: ''
        },
        checkRestriction: vi.fn(),
        getRestrictionMessage: vi.fn(),
        isSingleUser: true,
        canUpgrade: true,
        isLoading: false
      });

      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: 'template-2' },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      // Should have 3 templates: 2 global + 1 from values
      expect(result.current.templates.length).toBe(3);
      expect(result.current.templates.find(t => t.id === 'template-2')).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles missing templates gracefully', async () => {
      const { usePMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplates');
      
      vi.mocked(usePMTemplates).mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        status: 'success',
        fetchStatus: 'idle'
      } as ReturnType<typeof usePMTemplates>);

      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      expect(result.current.templates).toHaveLength(0);
      expect(result.current.selectedTemplate).toBeNull();
    });

    it('handles invalid template ID in values gracefully', async () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: 'non-existent-template' },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      // Should fall back to default template
      expect(result.current.selectedTemplate?.id).toBe('template-1');
    });

    it('handles null selectedEquipment', () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: null
        }),
        { wrapper }
      );

      expect(result.current.hasAssignedTemplate).toBeUndefined();
      expect(result.current.assignedTemplate).toBeNull();
    });

    it('handles equipment with null default_pm_template_id', () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: {
            id: 'equipment-1',
            name: 'Test Equipment',
            default_pm_template_id: null
          }
        }),
        { wrapper }
      );

      expect(result.current.hasAssignedTemplate).toBeNull();
      expect(result.current.assignedTemplate).toBeNull();
      expect(result.current.templates.length).toBeGreaterThan(0);
    });
  });

  describe('handleTemplateChange', () => {
    it('calls setValue with new template ID', () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: true, pmTemplateId: 'template-1' },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      act(() => {
        result.current.handleTemplateChange('template-2');
      });

      expect(setValue).toHaveBeenCalledWith('pmTemplateId', 'template-2');
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when templates are loading', async () => {
      const { usePMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplates');
      
      vi.mocked(usePMTemplates).mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        status: 'pending',
        fetchStatus: 'fetching'
      } as unknown as ReturnType<typeof usePMTemplates>);

      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('default template selection', () => {
    it('selects Forklift PM template when no template is specified', () => {
      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      expect(result.current.selectedTemplate?.name).toBe('Forklift PM');
    });

    it('falls back to first template if Forklift PM is not available', async () => {
      const { usePMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplates');
      
      const templatesWithoutDefault = mockTemplates.filter(t => t.name !== 'Forklift PM');
      vi.mocked(usePMTemplates).mockReturnValue({
        data: templatesWithoutDefault,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        status: 'success',
        fetchStatus: 'idle'
      } as ReturnType<typeof usePMTemplates>);

      const setValue = vi.fn();
      const { result } = renderHook(
        () => useWorkOrderPMChecklist({
          values: { hasPM: false, pmTemplateId: undefined },
          setValue,
          selectedEquipment: undefined
        }),
        { wrapper }
      );

      // Should select first available template
      expect(result.current.selectedTemplate?.id).toBe('template-2');
    });
  });
});
