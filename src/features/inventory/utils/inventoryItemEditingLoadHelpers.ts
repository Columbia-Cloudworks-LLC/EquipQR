import type { RefObject } from 'react';
import { logger } from '@/utils/logger';
import type {
  ModelMatchType,
  PartCompatibilityRuleFormData,
  VerificationStatus,
} from '@/features/inventory/types/inventory';

export function shouldIgnoreStaleInventoryItemEditingLoad(
  abortController: AbortController,
  currentEditingItemIdRef: RefObject<string | null>,
  itemId: string,
): boolean {
  if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
    logger.debug('Ignoring stale/aborted editing data load for item:', itemId);
    return true;
  }
  return false;
}

type CompatibilityRuleLoadRow = {
  manufacturer: string;
  model: string | null;
  match_type: ModelMatchType | null;
  status: VerificationStatus | null;
  notes: string | null;
};

export function mapInventoryCompatibilityRules(
  rulesData: CompatibilityRuleLoadRow[] | null,
): PartCompatibilityRuleFormData[] {
  return (rulesData || []).map((row): PartCompatibilityRuleFormData => ({
    manufacturer: row.manufacturer,
    model: row.model,
    match_type: row.match_type ?? 'exact',
    status: row.status ?? 'unverified',
    notes: row.notes ?? null,
  }));
}
