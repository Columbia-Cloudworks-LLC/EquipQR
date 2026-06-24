import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  EquipmentService,
  type DuplicateEquipmentMatch,
} from '@/features/equipment/services/EquipmentService';

interface UseDuplicateSerialCheckOptions {
  /**
   * Equipment id currently being edited. A self-match is ignored so an edit
   * form never warns about the record it is editing.
   */
  excludeEquipmentId?: string;
  /** Set false to disable the lookup entirely. */
  enabled?: boolean;
}

export interface DuplicateSerialResult {
  /** Existing record sharing the serial (excluding self), or null. */
  match: DuplicateEquipmentMatch | null;
  /** True while a lookup for the current serial is in flight. */
  isChecking: boolean;
  /** Serial value that produced the current `match` (debounced). */
  checkedSerial: string;
  /** True once the debounced query has settled for `checkedSerial`. */
  hasValidatedMatch: boolean;
}

const DEBOUNCE_MS = 400;

/**
 * Resolve duplicate-serial match for submit-time gating. Uses the debounced
 * hook result when it already matches the submitted serial; otherwise performs
 * an immediate lookup so fast submit after typing is accurate.
 */
export async function resolveDuplicateSerialAtSubmit(
  orgId: string | undefined,
  submittedSerial: string,
  excludeEquipmentId: string | undefined,
  current: Pick<DuplicateSerialResult, 'match' | 'checkedSerial' | 'isChecking' | 'hasValidatedMatch'>,
): Promise<DuplicateEquipmentMatch | null> {
  const trimmed = submittedSerial.trim();
  if (!orgId || !trimmed) return null;

  const hookResultIsCurrent =
    !current.isChecking &&
    current.checkedSerial === trimmed &&
    current.hasValidatedMatch;

  if (hookResultIsCurrent) {
    return current.match;
  }

  const res = await EquipmentService.findBySerial(orgId, trimmed);
  const raw = res.success ? res.data ?? null : null;
  if (raw && excludeEquipmentId && raw.id === excludeEquipmentId) return null;
  return raw;
}

/**
 * Non-blocking duplicate-serial detection for the equipment create/edit form.
 *
 * Serial numbers are not unique (see migration
 * `20260623210000_equipment_serial_drop_unique.sql`); this hook only surfaces a
 * warning so the operator can confirm they are not re-creating an existing
 * record. The result is intentionally NOT persisted offline (its query-key
 * prefix is excluded from `queryPersistence`).
 */
export function useDuplicateSerialCheck(
  serialNumber: string | undefined,
  options: UseDuplicateSerialCheckOptions = {},
): DuplicateSerialResult {
  const { currentOrganization } = useOrganization();
  const { excludeEquipmentId, enabled = true } = options;
  const trimmed = (serialNumber ?? '').trim();

  const [debounced, setDebounced] = useState(trimmed);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const orgId = currentOrganization?.id;
  const queryEnabled = enabled && !!orgId && debounced.length > 0;

  const { data, isFetching, isSuccess } = useQuery({
    queryKey: ['equipment-serial-check', orgId, debounced],
    enabled: queryEnabled,
    staleTime: 30_000,
    queryFn: async () => {
      if (!orgId) return null;
      const res = await EquipmentService.findBySerial(orgId, debounced);
      if (!res.success) {
        throw new Error(res.error ?? 'Duplicate serial lookup failed');
      }
      return res.data ?? null;
    },
  });

  const rawMatch = queryEnabled ? data ?? null : null;
  const match =
    rawMatch && excludeEquipmentId && rawMatch.id === excludeEquipmentId ? null : rawMatch;

  return {
    match,
    isChecking: queryEnabled && isFetching,
    checkedSerial: debounced,
    hasValidatedMatch: queryEnabled && isSuccess && !isFetching,
  };
}
