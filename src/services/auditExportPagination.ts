import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { AuditLogEntry, AuditLogFilters } from '@/types/audit';
import { applyAuditFilters } from '@/services/auditFilters';

const AUDIT_EXPORT_BATCH_SIZE = 5000;
const AUDIT_EXPORT_MAX_RECORDS = 10000;

type AuditExportPageConfig = {
  organizationId: string;
  filters?: AuditLogFilters;
  select: string;
  /** Optional exclusive upper bound for `created_at` (JSON export safety cap). */
  createdAtLte?: string;
  onProgress?: (progress: { current: number; total: number }) => void;
};

export async function fetchAuditLogExportEntries(
  config: AuditExportPageConfig,
): Promise<AuditLogEntry[]> {
  const {
    organizationId,
    filters,
    select,
    createdAtLte,
    onProgress,
  } = config;

  let countQuery = supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (createdAtLte) {
    countQuery = countQuery.lte('created_at', createdAtLte);
  }

  countQuery = applyAuditFilters(countQuery as never, filters) as typeof countQuery;
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const matchedRecords = count ?? 0;
  const totalRecords = Math.min(matchedRecords, AUDIT_EXPORT_MAX_RECORDS);
  onProgress?.({ current: 0, total: totalRecords });

  if (matchedRecords > AUDIT_EXPORT_MAX_RECORDS) {
    logger.warn(
      `Audit export capped at ${AUDIT_EXPORT_MAX_RECORDS.toLocaleString()} records (matched ${matchedRecords.toLocaleString()}).`,
    );
  }

  const allEntries: AuditLogEntry[] = [];
  let offset = 0;

  while (offset < totalRecords) {
    const pageEnd = Math.min(offset + AUDIT_EXPORT_BATCH_SIZE - 1, totalRecords - 1);
    let pageQuery = supabase
      .from('audit_log')
      .select(select)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, pageEnd);

    if (createdAtLte) {
      pageQuery = pageQuery.lte('created_at', createdAtLte);
    }

    pageQuery = applyAuditFilters(pageQuery as never, filters) as typeof pageQuery;

    const { data: pageData, error: pageError } = await pageQuery;
    if (pageError) throw pageError;

    const pageEntries = (pageData ?? []) as unknown as AuditLogEntry[];
    if (pageEntries.length === 0) break;

    allEntries.push(...pageEntries);
    offset += pageEntries.length;
    onProgress?.({ current: Math.min(offset, totalRecords), total: totalRecords });
  }

  return allEntries;
}

export async function logAuditExportNotification(
  organizationId: string,
  exportedCount: number,
): Promise<void> {
  if (exportedCount <= 0) return;

  const { error: notificationError } = await supabase.rpc('log_audit_export_notification', {
    p_organization_id: organizationId,
    p_exported_count: exportedCount,
  });
  if (notificationError) {
    logger.warn('Failed to log audit export notification', notificationError);
  }
}
