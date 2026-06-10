import type { MutableRefObject } from 'react';
import { logger } from '@/utils/logger';
import type { PartCompatibilityRuleFormData, ModelMatchType, VerificationStatus } from '@/features/inventory/types/inventory';

export function shouldIgnoreStaleInventoryItemEditingLoad(
  abortController: AbortController,
  currentEditingItemIdRef: MutableRefObject<string | null>,
  itemId: string,
): boolean {
  if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
    logger.debug('Ignoring stale/aborted editing data load for item:', itemId);
    return true;
  }
  return false;
}

export function mapInventoryCompatibilityRules(
  rulesData: Array<{
    manufacturer: string;
    model: string;
    match_type: string | null;
    status: string | null;
    notes: string | null;
  }> | null,
): PartCompatibilityRuleFormData[] {
  return (rulesData || []).map((row) => ({
    manufacturer: row.manufacturer,
    model: row.model,
    match_type: (row.match_type ?? 'exact') as ModelMatchType,
    status: (row.status ?? 'unverified') as VerificationStatus,
    notes: row.notes ?? null,
  }));
}
