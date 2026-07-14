import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import type { OperatorCheckinSubmissionFilters } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import {
  dateInputToLocalEndIso,
  dateInputToLocalStartIso,
} from '@/utils/localDateInputIso';

export interface LedgerAssignedEquipmentOption {
  equipmentId: string;
  name: string;
  serialNumber: string | null;
}

export interface GetAssignedEquipmentOptions {
  includeDisabledAssignments?: boolean;
}

export interface LedgerDateRange {
  startDate: string;
  endDate: string;
}

/** Local calendar date as `yyyy-MM-dd` for `<input type="date">`. */
export function getLocalDateInputValue(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function createDefaultLedgerDateRange(date = new Date()): LedgerDateRange {
  const today = getLocalDateInputValue(date);
  return { startDate: today, endDate: today };
}

export function subtractLocalCalendarDays(referenceDate: Date, daysToSubtract: number): string {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  date.setDate(date.getDate() - daysToSubtract);
  return getLocalDateInputValue(date);
}

export function createLedgerShortcutDate(daysAgo: number, referenceDate = new Date()): string {
  return subtractLocalCalendarDays(referenceDate, daysAgo);
}

/** Inclusive day count ending on the reference calendar day (e.g. 7 → today plus prior 6 days). */
export function createRelativeLedgerDateRange(
  inclusiveDayCount: number,
  referenceDate = new Date(),
): LedgerDateRange {
  const endDate = getLocalDateInputValue(referenceDate);
  const startDate = subtractLocalCalendarDays(referenceDate, inclusiveDayCount - 1);
  return normalizeLedgerDateRange(startDate, endDate);
}

export interface LedgerSingleDateShortcut {
  id: string;
  label: string;
  shortLabel: string;
  daysAgo: number;
}

export const LEDGER_SINGLE_DATE_SHORTCUTS: LedgerSingleDateShortcut[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today', daysAgo: 0 },
  { id: '7d', label: '1 Week Ago (7 Days)', shortLabel: '7 days ago', daysAgo: 7 },
  { id: '30d', label: '1 Month Ago (30 Days)', shortLabel: '30 days ago', daysAgo: 30 },
  { id: '90d', label: 'Last Quarter (90 Days)', shortLabel: '90 days ago', daysAgo: 90 },
  { id: '365d', label: 'Last Year (365 Days)', shortLabel: '1 year ago', daysAgo: 365 },
];

/** Ensures the range is contiguous with start on or before end. */
export function normalizeLedgerDateRange(startDate: string, endDate: string): LedgerDateRange {
  if (!startDate || !endDate) {
    return { startDate, endDate };
  }
  if (startDate <= endDate) {
    return { startDate, endDate };
  }
  return { startDate: endDate, endDate: startDate };
}

export function formatLedgerDateRangeLabel(startDate: string, endDate: string): string {
  const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeLedgerDateRange(
    startDate,
    endDate,
  );
  if (normalizedStart === normalizedEnd) return normalizedStart;
  return `${normalizedStart} – ${normalizedEnd}`;
}

export function formatLedgerDateRangeFilenamePart(startDate: string, endDate: string): string {
  const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeLedgerDateRange(
    startDate,
    endDate,
  );
  if (normalizedStart === normalizedEnd) return normalizedStart;
  return `${normalizedStart}_to_${normalizedEnd}`;
}

export function getAssignedEquipmentForTemplate(
  assignments: EquipmentOperatorCheckinAssignment[],
  templateId: string | undefined,
  options?: GetAssignedEquipmentOptions,
): LedgerAssignedEquipmentOption[] {
  if (!templateId) return [];

  const includeDisabled = options?.includeDisabledAssignments ?? false;
  const byEquipmentId = new Map<string, LedgerAssignedEquipmentOption>();
  for (const assignment of assignments) {
    if (assignment.template_id !== templateId) continue;
    if (!assignment.enabled && !includeDisabled) continue;
    const name = assignment.equipment?.name ?? assignment.equipment_id;
    byEquipmentId.set(assignment.equipment_id, {
      equipmentId: assignment.equipment_id,
      name,
      serialNumber: assignment.equipment?.serial_number ?? null,
    });
  }

  return [...byEquipmentId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface OperatorChecklistTemplateSummary {
  id: string;
  is_active: boolean;
}

/** Active templates plus archived templates only when the admin opts in. */
export function filterVisibleOperatorCheckinTemplates<T extends OperatorChecklistTemplateSummary>(
  templates: T[],
  showDeleted: boolean,
): T[] {
  if (showDeleted) return templates;
  return templates.filter((template) => template.is_active);
}

/** Report templates that have at least one assignment row for the equipment (including disabled). */
export function getReportTemplatesForEquipment<T extends OperatorChecklistTemplateSummary>(
  templates: T[],
  assignments: EquipmentOperatorCheckinAssignment[],
  equipmentId: string | undefined,
): T[] {
  if (!equipmentId) return [];

  const templateIds = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.equipment_id === equipmentId) {
      templateIds.add(assignment.template_id);
    }
  }

  return templates.filter((template) => templateIds.has(template.id));
}

export function isEquipmentAssignedToTemplate(
  assignments: EquipmentOperatorCheckinAssignment[],
  equipmentId: string,
  templateId: string,
  includeDisabledAssignments = false,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.equipment_id === equipmentId &&
      assignment.template_id === templateId &&
      (assignment.enabled || includeDisabledAssignments),
  );
}

export function buildLedgerSubmissionFilters(
  startDate: string,
  endDate: string,
  templateId: string | undefined,
  equipmentIds: string[],
): OperatorCheckinSubmissionFilters | null {
  if (!templateId || equipmentIds.length === 0) return null;

  const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeLedgerDateRange(
    startDate,
    endDate,
  );
  const from = dateInputToLocalStartIso(normalizedStart);
  const to = dateInputToLocalEndIso(normalizedEnd);
  if (!from || !to) return null;

  return {
    from,
    to,
    templateId,
    equipmentIds,
  };
}

export function buildEquipmentScopeLabel(
  options: LedgerAssignedEquipmentOption[],
  selectedEquipmentIds: string[],
): string {
  if (selectedEquipmentIds.length === 0) return 'No equipment selected';
  if (selectedEquipmentIds.length === options.length && options.length > 0) {
    return `All assigned equipment (${options.length})`;
  }
  if (selectedEquipmentIds.length === 1) {
    const match = options.find((option) => option.equipmentId === selectedEquipmentIds[0]);
    return match?.name ?? '1 selected equipment record';
  }
  return `${selectedEquipmentIds.length} selected equipment records`;
}

export function isLedgerQueryEnabled(filters: OperatorCheckinSubmissionFilters | null): boolean {
  return Boolean(filters?.templateId && filters.equipmentIds && filters.equipmentIds.length > 0);
}
