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
    query = query.eq('status', status);
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
  accessibleTeamIds?: string[],
) {
  let query = orgScopedExportCountQuery('work_orders', organizationId, filters.status);
  query = query.not('equipment_id', 'is', null);

  if (accessibleTeamIds !== undefined) {
    query = query.in('team_id', accessibleTeamIds);
  }
  if (filters.workOrderId) {
    query = query.eq('id', filters.workOrderId);
  }
  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  const dateField = filters.dateField ?? 'created_date';
  if (filters.dateRange?.from) {
    query = query.gte(dateField, filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte(dateField, filters.dateRange.to);
  }

  return query;
}
