import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import {
  QueryClient,
  QueryClientProvider,
  type QueryObserverPendingResult,
  type QueryObserverSuccessResult,
} from '@tanstack/react-query';
import React from 'react';
import {
  PM_TEMPLATE_NONE_VALUE,
  useWorkOrderPMChecklist,
  type WorkOrderPMChecklistEquipment,
  type WorkOrderPMChecklistValues,
} from './useWorkOrderPMChecklist';
import type { PMTemplateSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import type { MatchingPMTemplateResult } from '@/features/pm-templates/types/pmTemplateCompatibility';
import { getSimplifiedOrganizationRestrictions } from '@/utils/simplifiedOrganizationRestrictions';

const baseRestrictions = vi.hoisted(() => ({
  canManageTeams: true,
  canAssignEquipmentToTeams: true,
  canUploadImages: true,
  canAccessFleetMap: true,
  canInviteMembers: true,
  canCreateCustomPMTemplates: true,
  hasAvailableSlots: true,
  upgradeMessage: '',
}));

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
vi.mock('@/utils/simplifiedOrganizationRestrictions', () => ({
  getSimplifiedOrganizationRestrictions: vi.fn(() => baseRestrictions),
}));
vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  useMatchingPMTemplatesForOrganization: vi.fn(),
}));

const mockTemplates: PMTemplateSummary[] = [
  {
    id: 'template-1',
    name: 'Forklift PM',
    description: 'Default forklift template',
    organization_id: null,
    is_protected: true,
    sections: [{ name: 'Engine', count: 2 }],
    itemCount: 2,
    interval_value: null,
    interval_type: null,
  },
  {
    id: 'template-2',
    name: 'Custom Template',
    description: 'Organization template',
    organization_id: 'org-1',
    is_protected: false,
    sections: [{ name: 'Safety', count: 1 }],
    itemCount: 1,
    interval_value: null,
    interval_type: null,
  },
  {
    id: 'template-3',
    name: 'Another Global',
    description: 'Another global template',
    organization_id: null,
    is_protected: true,
    sections: [{ name: 'Hydraulics', count: 3 }],
    itemCount: 3,
    interval_value: null,
    interval_type: null,
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

function successQueryResult<T>(data: T): QueryObserverSuccessResult<T, Error> {
  return {
    data,
    error: null,
    isError: false,
    isPending: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    isPlaceholderData: false,
    status: 'success',
    fetchStatus: 'idle',
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isRefetching: false,
    isStale: false,
    isEnabled: true,
    refetch: vi.fn(),
  };
}

function pendingQueryResult<T>(): QueryObserverPendingResult<T, Error> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: true,
    isLoading: true,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: false,
    isPlaceholderData: false,
    status: 'pending',
    fetchStatus: 'fetching',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: true,
    isInitialLoading: true,
    isPaused: false,
    isRefetching: false,
    isStale: false,
    isEnabled: true,
    refetch: vi.fn(),
  };
}

const mockMatchingTemplates: MatchingPMTemplateResult[] = mockTemplates.map(t => ({
  template_id: t.id,
  template_name: t.name,
  template_description: t.description ?? null,
  is_protected: t.is_protected,
  template_organization_id: t.organization_id,
  match_type: 'manufacturer',
  matched_manufacturer: 'Toyota',
  matched_model: null,
}));

type PMChecklistHookOptions = {
  values?: { hasPM: boolean; pmTemplateId?: string | null };
  selectedEquipment?: Parameters<typeof useWorkOrderPMChecklist>[0]['selectedEquipment'];
  autoDefaultFromEquipment?: boolean;
  allowTemplateOverride?: boolean;
  organizationId?: string;
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
        organizationId: options.organizationId,
      }),
    { wrapper },
  );
  return { result: hook.result, setValue };
}

describe('useWorkOrderPMChecklist', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { usePMTemplatesForOrganization } = await import('@/features/pm-templates/hooks/usePMTemplates');
    const { useMatchingPMTemplatesForOrganization } = await import('@/features/pm-templates/hooks/usePMTemplateCompatibility');

    vi.mocked(usePMTemplatesForOrganization).mockReturnValue(successQueryResult(mockTemplates));

    vi.mocked(useMatchingPMTemplatesForOrganization).mockReturnValue(successQueryResult(mockMatchingTemplates));

    vi.mocked(getSimplifiedOrganizationRestrictions).mockReturnValue(baseRestrictions);
  });

  describe('template filtering', () => {
    it('returns all templates when user has custom PM template permissions', () => {
      const { result } = renderPMChecklistHook();

      expect(result.current.templates).toHaveLength(3);
    });

    it('returns only global templates when user lacks custom PM template permissions', async () => {
      vi.mocked(getSimplifiedOrganizationRestrictions).mockReturnValue({
        ...baseRestrictions,
        canCreateCustomPMTemplates: false,
        canAccessFleetMap: false,
        upgradeMessage: 'Upgrade for more features',
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

      const { result, rerender } = renderHook<
        ReturnType<typeof useWorkOrderPMChecklist>,
        {
          selectedEquipment: WorkOrderPMChecklistEquipment;
          values: WorkOrderPMChecklistValues;
        }
      >(
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
      const { usePMTemplatesForOrganization } = await import('@/features/pm-templates/hooks/usePMTemplates');

      vi.mocked(usePMTemplatesForOrganization).mockReturnValue(pendingQueryResult<PMTemplateSummary[]>());

      const { result } = renderPMChecklistHook();

      expect(result.current.isLoading).toBe(true);
    });
  });
  describe('organization scope', () => {
    it('queries templates for an explicit organizationId without SimpleOrganizationProvider', async () => {
      const { usePMTemplatesForOrganization } = await import('@/features/pm-templates/hooks/usePMTemplates');
      const { useMatchingPMTemplatesForOrganization } = await import('@/features/pm-templates/hooks/usePMTemplateCompatibility');

      const { result } = renderPMChecklistHook({
        organizationId: 'org-from-qr',
        selectedEquipment: { id: 'equipment-1', name: 'Forklift 17' },
      });

      expect(result.current.templates).toHaveLength(3);
      expect(vi.mocked(usePMTemplatesForOrganization)).toHaveBeenCalledWith('org-from-qr');
      expect(vi.mocked(useMatchingPMTemplatesForOrganization)).toHaveBeenCalledWith(
        'org-from-qr',
        'equipment-1',
        { enabled: true },
      );
    });
  });
});
