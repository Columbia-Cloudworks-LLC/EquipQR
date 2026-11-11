import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/types';
import type {
  CapturedFieldValue,
  OperatorChecklistAnswer,
  OperatorFieldSource,
} from '@/features/operator-check-ins/types/operatorChecklist';

export async function listOperatorCheckinTemplateIdsWithSubmissions(
  organizationId: string,
  templateIds?: string[],
): Promise<Set<string>> {
  if (templateIds && templateIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase.rpc('list_operator_checkin_restorable_template_ids', {
    p_organization_id: organizationId,
    p_template_ids: templateIds && templateIds.length > 0 ? templateIds : undefined,
  });

  if (error) throw error;

  return new Set(
    (Array.isArray(data) ? data : [])
      .filter((templateId): templateId is string => typeof templateId === 'string' && templateId.length > 0),
  );
}

export interface OperatorCheckinSubmission {
  id: string;
  organization_id: string;
  equipment_id: string;
  template_id: string | null;
  settings_id: string | null;
  submitted_at: string;
  template_snapshot: Record<string, unknown>;
  operator_field_values: CapturedFieldValue[];
  client_field_values: CapturedFieldValue[];
  equipment_field_values: CapturedFieldValue[];
  checklist_answers: OperatorChecklistAnswer[];
  is_complete: boolean;
  required_item_count: number;
  answered_required_count: number;
  equipment?: { id: string; name: string; serial_number: string | null } | null;
}

const CAPTURED_FIELD_SOURCES: readonly OperatorFieldSource[] = [
  'operator_input',
  'client_context',
  'equipment_snapshot',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCapturedFieldValue(value: unknown): value is CapturedFieldValue {
  return (
    isRecord(value) &&
    typeof value.field_id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.source === 'string' &&
    CAPTURED_FIELD_SOURCES.some((source) => source === value.source) &&
    (value.value === null ||
      typeof value.value === 'string' ||
      typeof value.value === 'number' ||
      typeof value.value === 'boolean')
  );
}

function isChecklistAnswer(value: unknown): value is OperatorChecklistAnswer {
  return (
    isRecord(value) &&
    typeof value.item_id === 'string' &&
    typeof value.passed === 'boolean' &&
    (value.notes === undefined || typeof value.notes === 'string')
  );
}

function filterJsonArray<T>(value: Json, guard: (item: unknown) => item is T): T[] {
  const result: T[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (guard(item)) result.push(item);
    }
  }
  return result;
}

type SubmissionRow = Tables<'operator_checkin_submissions'> & {
  equipment?: OperatorCheckinSubmission['equipment'];
};

function mapSubmissionRow(row: SubmissionRow): OperatorCheckinSubmission {
  return {
    ...row,
    template_snapshot: isRecord(row.template_snapshot) ? row.template_snapshot : {},
    operator_field_values: filterJsonArray(row.operator_field_values, isCapturedFieldValue),
    client_field_values: filterJsonArray(row.client_field_values, isCapturedFieldValue),
    equipment_field_values: filterJsonArray(row.equipment_field_values, isCapturedFieldValue),
    checklist_answers: filterJsonArray(row.checklist_answers, isChecklistAnswer),
  };
}

export interface OperatorCheckinSubmissionFilters {
  from?: string;
  to?: string;
  /** @deprecated Prefer equipmentIds for multi-select ledger scope. */
  equipmentId?: string;
  templateId?: string;
  equipmentIds?: string[];
}

export async function listOperatorCheckinSubmissions(
  organizationId: string,
  filters: OperatorCheckinSubmissionFilters = {},
): Promise<OperatorCheckinSubmission[]> {
  let query = supabase
    .from('operator_checkin_submissions')
    .select(`
      *,
      equipment:equipment_id (id, name, serial_number)
    `)
    .eq('organization_id', organizationId)
    .order('submitted_at', { ascending: false })
    .limit(500);

  const equipmentIds = filters.equipmentIds
    ?? (filters.equipmentId ? [filters.equipmentId] : undefined);

  if (filters.templateId) {
    query = query.eq('template_id', filters.templateId);
  }
  if (equipmentIds && equipmentIds.length > 0) {
    query = query.in('equipment_id', equipmentIds);
  }
  if (filters.from) {
    query = query.gte('submitted_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('submitted_at', filters.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapSubmissionRow);
}
