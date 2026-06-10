import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry } from '@/types/audit';
import { buildAuditLogQueryResult, resolveAuditPagination } from '@/services/auditPagination';
import type { AuditLogPagination } from '@/types/audit';

type AuditLogFilter = {
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
};

export async function fetchAuditLogPage(
  organizationId: string,
  filters: AuditLogFilter,
  pagination: AuditLogPagination | undefined,
  defaultPageSize: number,
) {
  const { pageSize, offset } = resolveAuditPagination(pagination, defaultPageSize);

  let countQuery = supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  let dataQuery = supabase
    .from('audit_log')
    .select('*')
    .eq('organization_id', organizationId);

  if (filters.entity_type) {
    countQuery = countQuery.eq('entity_type', filters.entity_type);
    dataQuery = dataQuery.eq('entity_type', filters.entity_type);
  }
  if (filters.entity_id) {
    countQuery = countQuery.eq('entity_id', filters.entity_id);
    dataQuery = dataQuery.eq('entity_id', filters.entity_id);
  }
  if (filters.actor_id) {
    countQuery = countQuery.eq('actor_id', filters.actor_id);
    dataQuery = dataQuery.eq('actor_id', filters.actor_id);
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const { data, error } = await dataQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return buildAuditLogQueryResult((data ?? []) as unknown as AuditLogEntry[], count ?? 0, offset, pageSize);
}
