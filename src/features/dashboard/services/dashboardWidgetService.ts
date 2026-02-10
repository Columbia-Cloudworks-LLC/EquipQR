import { supabase } from '@/integrations/supabase/client';

/**
 * Dashboard widget service layer.
 * Centralises Supabase queries so widgets stay focused on presentation.
 */

// ─── PM Compliance ──────────────────────────────────────────────────────────

export interface PMWorkOrderRow {
  id: string;
  status: string;
}

export interface PMOverdueRow {
  id: string;
}

/**
 * Fetch PM-templated work orders and their overdue subset for a given org.
 * Both queries scope by organization_id and limit to 2 years of history.
 */
export async function fetchPMComplianceData(organizationId: string) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const cutoff = twoYearsAgo.toISOString();

  const { data: rows, error: rowsError } = await supabase
    .from('work_orders')
    .select('id, status')
    .eq('organization_id', organizationId)
    .not('pm_template_id', 'is', null)
    .gte('created_at', cutoff);

  if (rowsError) throw rowsError;

  const { data: overdueRows, error: overdueError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('organization_id', organizationId)
    .not('pm_template_id', 'is', null)
    .in('status', ['pending', 'submitted', 'assigned', 'in_progress'])
    .lt('due_date', new Date().toISOString())
    .gte('created_at', cutoff);

  if (overdueError) throw overdueError;

  return { rows: rows ?? [], overdueRows: overdueRows ?? [] };
}

// ─── Equipment by Status ────────────────────────────────────────────────────

export interface EquipmentStatusRow {
  status: string;
}

/**
 * Fetch the `status` column for all equipment in the given org.
 * Note: fetches only the `status` column (minimal payload). A server-side
 * aggregate (RPC/view with GROUP BY + COUNT) would further reduce transfer
 * for very large fleets — tracked for future optimization.
 */
export async function fetchEquipmentByStatus(organizationId: string): Promise<EquipmentStatusRow[]> {
  const { data: rows, error } = await supabase
    .from('equipment')
    .select('status')
    .eq('organization_id', organizationId);

  if (error) throw error;
  return rows ?? [];
}

// ─── Cost Trend ─────────────────────────────────────────────────────────────

export interface CostRow {
  totalPriceCents: number;
  createdAt: string;
}

/**
 * Fetch work order costs for the last 12 months, scoped to an organisation
 * via an inner join on work_orders.organization_id.
 */
export async function fetchCostTrendData(organizationId: string): Promise<CostRow[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data, error } = await supabase
    .from('work_order_costs')
    .select('total_price_cents, created_at, work_orders!inner(organization_id)')
    .eq('work_orders.organization_id', organizationId)
    .gte('created_at', twelveMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    totalPriceCents: row.total_price_cents ?? 0,
    createdAt: row.created_at,
  }));
}
