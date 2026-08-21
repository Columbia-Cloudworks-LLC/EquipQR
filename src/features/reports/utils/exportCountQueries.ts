import { supabase } from '@/integrations/supabase/client';
import { Constants, type Database } from '@/integrations/supabase/types';
import type { ExportFilters } from '@/features/reports/types/reports';

type EquipmentStatus = Database['public']['Enums']['equipment_status'];
type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
type WorkOrderPriority = Database['public']['Enums']['work_order_priority'];

export type WorkOrderCountFilterInput = {
  status?: string;
  teamId?: string;
  priority?: string;
  workOrderId?: string;
  dateField?: 'created_date' | 'completed_date';
  dateRange?: { from?: string; to?: string };
};

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) {
    return undefined;
  }
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function buildEquipmentExportCountQuery(organizationId: string, filters: ExportFilters) {
  let query = supabase
    .from('equipment')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  const status = parseEnum<EquipmentStatus>(filters.status, Constants.public.Enums.equipment_status);
  if (status) {
    query = query.eq('status', status);
  }
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
  let query = supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .not('equipment_id', 'is', null);

  if (accessibleTeamIds !== undefined) {
    query = query.in('team_id', accessibleTeamIds);
  }

  const status = parseEnum<WorkOrderStatus>(filters.status, Constants.public.Enums.work_order_status);
  if (status) {
    query = query.eq('status', status);
  }
  if (filters.workOrderId) {
    query = query.eq('id', filters.workOrderId);
  }
  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }

  const priority = parseEnum<WorkOrderPriority>(
    filters.priority,
    Constants.public.Enums.work_order_priority,
  );
  if (priority) {
    query = query.eq('priority', priority);
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
