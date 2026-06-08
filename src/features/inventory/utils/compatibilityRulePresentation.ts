import type { ModelMatchType } from '@/features/inventory/types/inventory';
import type { PartCompatibilityRule } from '@/features/inventory/types/inventory';

export function getCompatibilityRuleMatchTypeLabel(
  rule: Pick<PartCompatibilityRule, 'match_type' | 'model' | 'model_pattern_raw'>
): string {
  const matchType = (rule.match_type || 'exact') as ModelMatchType;
  return {
    any: 'Any model',
    exact: rule.model || 'Any model',
    prefix: `${rule.model}*`,
    wildcard: rule.model_pattern_raw || rule.model || '?',
  }[matchType];
}
