import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAppToast } from '@/hooks/useAppToast';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { 
  PMTemplateCompatibilityRule, 
  PMTemplateCompatibilityRuleFormData,
  MatchingPMTemplateResult 
} from '@/features/pm-templates/types/pmTemplateCompatibility';
import {
  getRulesForTemplate,
  bulkSetRules,
  countEquipmentMatchingRules,
  getMatchingTemplatesForEquipment
} from '@/features/pm-templates/services/pmTemplateCompatibilityRulesService';
import { queryKeys } from '@/lib/queryKeys';

// ============================================
// Query Keys
// ============================================

const pmTemplateCompatibilityKeys = {
  all: ['pm-template-compatibility'] as const,
  rules: (templateId: string) => [...pmTemplateCompatibilityKeys.all, 'rules', templateId] as const,
  matching: (equipmentId: string) => [...pmTemplateCompatibilityKeys.all, 'matching', equipmentId] as const,
  matchCount: (rulesKey: string) => [...pmTemplateCompatibilityKeys.all, 'match-count', rulesKey] as const
};

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch compatibility rules for a PM template.
 */
export const usePMTemplateCompatibilityRules = (
  templateId: string | undefined,
  options?: {
    staleTime?: number;
    enabled?: boolean;
  }
) => {
  const { currentOrganization } = useOrganization();
  const staleTime = options?.staleTime ?? 5 * 60 * 1000; // 5 minutes
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: pmTemplateCompatibilityKeys.rules(templateId || ''),
    queryFn: async (): Promise<PMTemplateCompatibilityRule[]> => {
      if (!currentOrganization?.id || !templateId) return [];
      return await getRulesForTemplate(currentOrganization.id, templateId);
    },
    enabled: !!currentOrganization?.id && !!templateId && enabled,
    staleTime
  });
};

/**
 * Hook to fetch PM templates that match a given equipment.
 * Returns templates with match type info (model vs manufacturer match).
 * Uses org-scoped [`pm-template-matching`, orgId, equipmentId] keys — for QR PM picker and similar.
 */
export const useMatchingPMTemplatesForEquipment = (
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  }
) => {
  const staleTime = options?.staleTime ?? 10 * 60 * 1000;
  const gcTime = options?.gcTime ?? 30 * 60 * 1000;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.pmTemplateMatching.forEquipment(organizationId ?? '', equipmentId ?? ''),
    queryFn: async (): Promise<MatchingPMTemplateResult[]> => {
      if (!organizationId || !equipmentId) return [];
      return await getMatchingTemplatesForEquipment(organizationId, equipmentId);
    },
    enabled: !!organizationId && !!equipmentId && enabled,
    staleTime,
    gcTime,
  });
};

/** Dashboard context: matching templates for current organization (distinct query cache from QR org-scoped key). */
export const useMatchingPMTemplates = (
  equipmentId: string | undefined,
  options?: {
    staleTime?: number;
    enabled?: boolean;
  }
) => {
  const { currentOrganization } = useOrganization();
  const staleTime = options?.staleTime ?? 10 * 60 * 1000; // 10 min — rules change rarely
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: pmTemplateCompatibilityKeys.matching(equipmentId || ''),
    queryFn: async (): Promise<MatchingPMTemplateResult[]> => {
      if (!currentOrganization?.id || !equipmentId) return [];
      return await getMatchingTemplatesForEquipment(currentOrganization.id, equipmentId);
    },
    enabled: !!currentOrganization?.id && !!equipmentId && enabled,
    staleTime,
    gcTime: 30 * 60 * 1000, // 30 min — survive offline
  });
};

/**
 * Hook to count equipment matching a set of rules.
 * Used for displaying match count in the UI as users edit rules.
 */
export const useEquipmentMatchCountForPMRules = (
  organizationId: string | undefined,
  rules: PMTemplateCompatibilityRuleFormData[],
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 5 * 60 * 1000; // 5 min — derived data

  // Memoize a stable rules array based on its content.
  // react-hook-form recreates the rules array reference on every render
  const stableRules = useMemo(
    () => rules,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content-based comparison via JSON.stringify
    [JSON.stringify(rules)]
  );

  // Create a stable string key from rules for React Query cache
  const rulesKey = useMemo(() => {
    if (stableRules.length === 0) return '';
    return stableRules
      .map(r => `${r.manufacturer.toLowerCase().trim()}|${r.model?.toLowerCase().trim() ?? ''}`)
      .sort()
      .join(',');
  }, [stableRules]);

  return useQuery({
    queryKey: pmTemplateCompatibilityKeys.matchCount(rulesKey),
    queryFn: async () => {
      if (!organizationId || stableRules.length === 0) return 0;
      return await countEquipmentMatchingRules(organizationId, stableRules);
    },
    enabled: !!organizationId && stableRules.length > 0,
    staleTime,
    gcTime: 15 * 60 * 1000, // 15 min
  });
};

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to bulk set (replace) all compatibility rules for a PM template.
 * Uses atomic transaction for guaranteed consistency.
 */
export const useBulkSetPMTemplateRules = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      templateId,
      rules
    }: {
      templateId: string;
      rules: PMTemplateCompatibilityRuleFormData[];
    }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return await bulkSetRules(currentOrganization.id, templateId, rules);
    },
    onSuccess: (result, variables) => {
      // Invalidate rules query for this template
      queryClient.invalidateQueries({
        queryKey: pmTemplateCompatibilityKeys.rules(variables.templateId)
      });
      // Invalidate all matching queries since template rules changed
      queryClient.invalidateQueries({
        queryKey: [...pmTemplateCompatibilityKeys.all, 'matching']
      });
      
      toast({
        title: 'Compatibility rules updated',
        description: `${result.rulesSet} rule${result.rulesSet !== 1 ? 's' : ''} set`
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating rules',
        description: error instanceof Error ? error.message : 'Failed to update rules',
        variant: 'error'
      });
    }
  });
};
