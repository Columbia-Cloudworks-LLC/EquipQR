import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAppToast } from '@/hooks/useAppToast';
import { useOrganization } from '@/contexts/OrganizationContext';
import type {
  PMTemplateCompatibilityRule,
  PMTemplateCompatibilityRuleFormData,
  MatchingPMTemplateResult,
} from '@/features/pm-templates/types/pmTemplateCompatibility';
import {
  getRulesForTemplate,
  bulkSetRules,
  countEquipmentMatchingRules,
  getMatchingTemplatesForEquipment,
} from '@/features/pm-templates/services/pmTemplateCompatibilityRulesService';
import { queryKeys } from '@/lib/queryKeys';

// ============================================
// Query Keys
// ============================================

const pmTemplateCompatibilityKeys = {
  all: ['pm-template-compatibility'] as const,
  rules: (templateId: string) => [...pmTemplateCompatibilityKeys.all, 'rules', templateId] as const,
  matching: (equipmentId: string) => [...pmTemplateCompatibilityKeys.all, 'matching', equipmentId] as const,
  matchCount: (rulesKey: string) => [...pmTemplateCompatibilityKeys.all, 'match-count', rulesKey] as const,
};

const DEFAULT_RULES_STALE_TIME = 5 * 60 * 1000;
const DEFAULT_MATCHING_STALE_TIME = 10 * 60 * 1000;
const DEFAULT_MATCHING_GC_TIME = 30 * 60 * 1000;
const DEFAULT_MATCH_COUNT_GC_TIME = 15 * 60 * 1000;

type QueryTimingOptions = {
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
};

async function loadCompatibilityRules(
  organizationId: string | undefined,
  templateId: string | undefined
): Promise<PMTemplateCompatibilityRule[]> {
  if (!organizationId || !templateId) return [];
  return getRulesForTemplate(organizationId, templateId);
}

async function loadMatchingTemplates(
  organizationId: string | undefined,
  equipmentId: string | undefined
): Promise<MatchingPMTemplateResult[]> {
  if (!organizationId || !equipmentId) return [];
  return getMatchingTemplatesForEquipment(organizationId, equipmentId);
}

const isOrgScopedQueryEnabled = (
  organizationId: string | undefined,
  resourceId: string | undefined,
  enabled: boolean
) => Boolean(organizationId && resourceId && enabled);

function useMatchingTemplatesQuery(
  organizationId: string | undefined,
  equipmentId: string | undefined,
  queryKey: readonly unknown[],
  options?: QueryTimingOptions
) {
  const staleTime = options?.staleTime ?? DEFAULT_MATCHING_STALE_TIME;
  const gcTime = options?.gcTime ?? DEFAULT_MATCHING_GC_TIME;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey,
    queryFn: () => loadMatchingTemplates(organizationId, equipmentId),
    enabled: isOrgScopedQueryEnabled(organizationId, equipmentId, enabled),
    staleTime,
    gcTime,
  });
}

function buildRulesCacheKey(rules: PMTemplateCompatibilityRuleFormData[]): string {
  if (rules.length === 0) return '';
  return rules
    .map(
      (r) =>
        `${(r.manufacturer ?? '').toLowerCase().trim()}|${r.model?.toLowerCase().trim() ?? ''}`,
    )
    .sort()
    .join(',');
}

function invalidateCompatibilityCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  templateId: string
) {
  queryClient.invalidateQueries({
    queryKey: pmTemplateCompatibilityKeys.rules(templateId),
  });
  queryClient.invalidateQueries({
    queryKey: [...pmTemplateCompatibilityKeys.all, 'matching'],
  });
}

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
  const staleTime = options?.staleTime ?? DEFAULT_RULES_STALE_TIME;
  const enabled = options?.enabled ?? true;
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: pmTemplateCompatibilityKeys.rules(templateId || ''),
    queryFn: () => loadCompatibilityRules(organizationId, templateId),
    enabled: isOrgScopedQueryEnabled(organizationId, templateId, enabled),
    staleTime,
  });
};

/** Dashboard context: matching templates for current organization (distinct query cache from QR org-scoped key). */
export const useMatchingPMTemplates = (
  equipmentId: string | undefined,
  options?: Pick<QueryTimingOptions, 'staleTime' | 'enabled'>
) => {
  const { currentOrganization } = useOrganization();

  return useMatchingTemplatesQuery(
    currentOrganization?.id,
    equipmentId,
    pmTemplateCompatibilityKeys.matching(equipmentId || ''),
    {
      ...options,
      gcTime: DEFAULT_MATCHING_GC_TIME,
    }
  );
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
  const staleTime = options?.staleTime ?? DEFAULT_RULES_STALE_TIME;

  // Memoize a stable rules array based on its content.
  // react-hook-form recreates the rules array reference on every render
  const stableRules = useMemo(
    () => rules,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content-based comparison via JSON.stringify
    [JSON.stringify(rules)]
  );

  const rulesKey = useMemo(() => buildRulesCacheKey(stableRules), [stableRules]);

  return useQuery({
    queryKey: pmTemplateCompatibilityKeys.matchCount(rulesKey),
    queryFn: async () => {
      if (!organizationId || stableRules.length === 0) return 0;
      return countEquipmentMatchingRules(organizationId, stableRules);
    },
    enabled: Boolean(organizationId && stableRules.length > 0),
    staleTime,
    gcTime: DEFAULT_MATCH_COUNT_GC_TIME,
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
      rules,
    }: {
      templateId: string;
      rules: PMTemplateCompatibilityRuleFormData[];
    }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return bulkSetRules(currentOrganization.id, templateId, rules);
    },
    onSuccess: (result, variables) => {
      invalidateCompatibilityCaches(queryClient, variables.templateId);

      toast({
        title: 'Compatibility rules updated',
        description: `${result.rulesSet} rule${result.rulesSet !== 1 ? 's' : ''} set`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating rules',
        description: error instanceof Error ? error.message : 'Failed to update rules',
        variant: 'error',
      });
    },
  });
};
