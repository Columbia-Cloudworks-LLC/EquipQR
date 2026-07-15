import { supabase } from '@/integrations/supabase/client';
import type { CapturedFieldValue, OperatorChecklistAnswer } from '@/features/operator-check-ins/types/operatorChecklist';

export async function listOperatorCheckinTemplateIdsWithSubmissions(
  organizationId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('operator_checkin_submissions')
    .select('template_id')
    .eq('organization_id', organizationId)
    .not('template_id', 'is', null);

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => row.template_id)
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
  return (data ?? []) as OperatorCheckinSubmission[];
}
