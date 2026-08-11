import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  PM_TEMPLATE_NONE_VALUE,
  useWorkOrderPMChecklist,
} from './useWorkOrderPMChecklist';
import * as usePMTemplatesModule from '@/features/pm-templates/hooks/usePMTemplates';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null })),
    })),
  },
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates');
vi.mock('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  useMatchingPMTemplates: vi.fn(),
}));

const mockTemplates = [
  {
    id: 'template-1',
    name: 'Forklift PM',
    description: 'Default forklift template',
    organization_id: null,
    is_protected: true,
    sections: [{ name: 'Engine', count: 2 }],
    itemCount: 2,
  },
  {
    id: 'template-2',
    name: 'Custom Template',
    description: 'Organization template',
    organization_id: 'org-1',
    is_protected: false,
    sections: [{ name: 'Safety', count: 1 }],
    itemCount: 1,
  },
  {
    id: 'template-3',
    name: 'Another Global',
    description: 'Another global template',
    organization_id: null,
    is_protected: true,
    sections: [{ name: 'Hydraulics', count: 3 }],
    itemCount: 3,
  },
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

function mockPMTemplatesResult(
  overrides: Partial<ReturnType<typeof usePMTemplatesModule.usePMTemplates>> = {},
): ReturnType<typeof usePMTemplatesModule.usePMTemplates> {
  return {
    data: mockTemplates,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    status: 'success',
    fetchStatus: 'idle',
    ...overrides,
  } as ReturnType<typeof usePMTemplatesModule.usePMTemplates>;
}

type PMChecklistHookOptions = {
  values?: { hasPM: boolean; pmTemplateId?: string | null };
  selectedEquipment?: Parameters<typeof useWorkOrderPMChecklist>[0]['selectedEquipment'];
  autoDefaultFromEquipment?: boolean;
  allowTemplateOverride?: boolean;
};

function renderPMChecklistHook(options: PMChecklistHookOptions = {}) {
  const setValue = vi.fn();
  const values = options.values ?? { hasPM: false, pmTemplateId: null };
  const hook = renderHook(
    () =>
      useWorkOrderPMChecklist({
        values,
        setValue,
        selectedEquipment: options.selectedEquipment,
        autoDefaultFromEquipment: options.autoDefaultFromEquipment,
        allowTemplateOverride: options.allowTemplateOverride,
      }),
    { wrapper },
  );
  return { result: hook.result, setValue };
}

describe('useWorkOrderPMChecklist', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { usePMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplates');
    const { useSimplifiedOrganizationRestrictions } = await import('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');
    const { useMatchingPMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplateCompatibility');

    vi.mocked(usePMTemplates).mockReturnValue(mockPMTemplatesResult());

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
      promise: Promise.resolve([]),
    } as unknown as ReturnType<typeof useMatchingPMTemplates>);

    vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
      restrictions: {
        canCreateCustomPMTemplates: true,
        canAddMembers: true,
        canAccessAdvancedAnalytics: true,
        canAccessFleetMap: true,
        upgradeMessage: '',
      },
      checkRestriction: vi.fn(),
      getRestrictionMessage: vi.fn(),
      isSingleUser: false,
      canUpgrade: true,
      isLoading: false,
    });
  });

  describe('template filtering', () => {
    it('returns all templates when user has custom PM template permissions', () => {
      const { result } = renderPMChecklistHook();

      expect(result.current.templates).toHaveLength(3);
    });

    it('returns only global templates when user lacks custom PM template permissions', async () => {
      const { useSimplifiedOrganizationRestrictions } = await import('@/features/organization/hooks/useSimplifiedOrganizationRestrictions');

      vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
        restrictions: {
          canCreateCustomPMTemplates: false,
          canAddMembers: true,
          canAccessAdvancedAnalytics: false,
          canAccessFleetMap: false,
          upgradeMessage: 'Upgrade for more features',
        },
        checkRestriction: vi.fn(),
        getRestrictionMessage: vi.fn(),
        isSingleUser: true,
        canUpgrade: true,
        isLoading: false,
      });

      const { result } = renderPMChecklistHook();

      expect(result.current.templates).toHaveLength(2);
      expect(result.current.templates.every(t => t.organization_id === null)).toBe(true);
    });

    it('includes assigned equipment template even when compatibility filtering applies', () => {
      const { result } = renderPMChecklistHook({
        selectedEquipment: {
          id: 'equipment-1',
          name: 'Test Equipment',
          default_pm_template_id: 'template-1',
        },
      });

      expect(result.current.hasAssignedTemplate).toBe(true);
      expect(result.current.templates.map(t => t.id)).toContain('template-1');
    });
  });

  describe('equipment defaults', () => {
    it('auto-applies equipment default template on create when enabled', () => {
      const setValue = vi.fn();
      renderHook(
        () =>
          useWorkOrderPMChecklist({
            values: { hasPM: false, pmTemplateId: null },
            setValue,
            selectedEquipment: {
              id: 'equipment-1',
              name: 'Test Equipment',
              default_pm_template_id: 'template-1',
            },
            autoDefaultFromEquipment: true,
          }),
        { wrapper },
      );

      expect(setValue).toHaveBeenCalledWith('pmTemplateId', 'template-1');
      expect(setValue).toHaveBeenCalledWith('hasPM', true);
    });

    it('auto-applies None when equipment has no default template', () => {
      const setValue = vi.fn();
      renderHook(
        () =>
          useWorkOrderPMChecklist({
            values: { hasPM: true, pmTemplateId: 'template-2' },
            setValue,
            selectedEquipment: {
              id: 'equipment-1',
              name: 'Test Equipment',
              default_pm_template_id: null,
            },
            autoDefaultFromEquipment: true,
          }),
        { wrapper },
      );

      expect(setValue).toHaveBeenCalledWith('pmTemplateId', null);
      expect(setValue).toHaveBeenCalledWith('hasPM', false);
    });

    it('does not overwrite a user-selected template when equipment changes', () => {
      const setValue = vi.fn();
      const selectedEquipmentA = {
        id: 'equipment-a',
        name: 'Equipment A',
        default_pm_template_id: 'template-1',
      };
      const selectedEquipmentB = {
        id: 'equipment-b',
        name: 'Equipment B',
        default_pm_template_id: 'template-2',
      };

      const { result, rerender } = renderHook(
        ({ selectedEquipment, values }) =>
          useWorkOrderPMChecklist({
            values,
            setValue,
            selectedEquipment,
            autoDefaultFromEquipment: true,
          }),
        {
          wrapper,
          initialProps: {
            selectedEquipment: selectedEquipmentA,
            values: { hasPM: false, pmTemplateId: null },
          },
        },
      );

      setValue.mockClear();
      result.current.handleTemplateChange('template-3');

      rerender({
        selectedEquipment: selectedEquipmentB,
        values: { hasPM: true, pmTemplateId: 'template-3' },
      });

      expect(setValue).not.toHaveBeenCalledWith('pmTemplateId', 'template-2');
      expect(setValue).not.toHaveBeenCalledWith('pmTemplateId', null);
    });

    it('does not auto-apply defaults when autoDefaultFromEquipment is false', () => {
      const setValue = vi.fn();
      renderHook(
        () =>
          useWorkOrderPMChecklist({
            values: { hasPM: false, pmTemplateId: null },
            setValue,
            selectedEquipment: {
              id: 'equipment-1',
              name: 'Test Equipment',
              default_pm_template_id: 'template-1',
            },
          }),
        { wrapper },
      );

      expect(setValue).not.toHaveBeenCalled();
    });
  });

  describe('template selection', () => {
    it('selects the current template from values', () => {
      const { result } = renderPMChecklistHook({
        values: { hasPM: true, pmTemplateId: 'template-2' },
      });

      expect(result.current.selectedTemplate?.id).toBe('template-2');
      expect(result.current.selectValue).toBe('template-2');
    });

    it('uses none sentinel when no template is selected', () => {
      const { result } = renderPMChecklistHook({
        values: { hasPM: false, pmTemplateId: null },
      });

      expect(result.current.selectedTemplate).toBeNull();
      expect(result.current.selectValue).toBe(PM_TEMPLATE_NONE_VALUE);
    });
  });

  describe('handleTemplateChange', () => {
    it('sets template and hasPM when selecting a template', () => {
      const { result, setValue } = renderPMChecklistHook();

      act(() => {
        result.current.handleTemplateChange('template-2');
      });

      expect(setValue).toHaveBeenCalledWith('pmTemplateId', 'template-2');
      expect(setValue).toHaveBeenCalledWith('hasPM', true);
    });

    it('clears template and hasPM when selecting none', () => {
      const { result, setValue } = renderPMChecklistHook({
        values: { hasPM: true, pmTemplateId: 'template-1' },
      });

      act(() => {
        result.current.handleTemplateChange(PM_TEMPLATE_NONE_VALUE);
      });

      expect(setValue).toHaveBeenCalledWith('pmTemplateId', null);
      expect(setValue).toHaveBeenCalledWith('hasPM', false);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when templates are loading', async () => {
      const { usePMTemplates } = await import('@/features/pm-templates/hooks/usePMTemplates');

      vi.mocked(usePMTemplates).mockReturnValue(
        mockPMTemplatesResult({
          data: undefined,
          isLoading: true,
          isSuccess: false,
          status: 'pending',
          fetchStatus: 'fetching',
        }) as unknown as ReturnType<typeof usePMTemplates>,
      );

      const { result } = renderPMChecklistHook();

      expect(result.current.isLoading).toBe(true);
    });
  });
});
