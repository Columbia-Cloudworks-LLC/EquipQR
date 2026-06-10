import { supabase } from '@/integrations/supabase/client';
import type { ExportFilters } from '@/features/reports/types/reports';

export type WorkOrderCountFilterInput = {
  status?: string;
  teamId?: string;
  priority?: string;
  workOrderId?: string;
  dateField?: string;
  dateRange?: { from?: string; to?: string };
};

function orgScopedExportCountQuery(
  table: 'equipment' | 'work_orders',
  organizationId: string,
  status?: string,
) {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (status) {
    query = query.eq('status', status as never);
  }

  return query;
}

export function buildEquipmentExportCountQuery(organizationId: string, filters: ExportFilters) {
  let query = orgScopedExportCountQuery('equipment', organizationId, filters.status);
  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  return query;
}

export function buildWorkOrderExportCountQuery(
  organizationId: string,
  filters: WorkOrderCountFilterInput,
) {
  let query = orgScopedExportCountQuery('work_orders', organizationId, filters.status) as never;
  if (filters.workOrderId) {
    query = (query as { eq: (column: string, value: string) => never }).eq('id', filters.workOrderId);
  }
  if (filters.teamId) {
    query = (query as { eq: (column: string, value: string) => never }).eq('team_id', filters.teamId);
  }
  if (filters.priority) {
    query = (query as { eq: (column: string, value: string) => never }).eq('priority', filters.priority);
  }

  const dateField = (filters.dateField ?? 'created_date') as 'created_date' | 'due_date' | 'completed_date';
  if (filters.dateRange?.from) {
    query = (query as { gte: (column: string, value: string) => never }).gte(dateField, filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = (query as { lte: (column: string, value: string) => never }).lte(dateField, filters.dateRange.to);
  }

  return query as ReturnType<typeof orgScopedExportCountQuery>;
}
