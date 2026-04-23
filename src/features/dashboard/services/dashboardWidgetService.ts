import { supabase } from '@/integrations/supabase/client';

/**
 * Dashboard widget service layer.
 * Centralises Supabase queries so widgets stay focused on presentation.
 */

// ─── PM Compliance ──────────────────────────────────────────────────────────

export interface PMComplianceRow {
  id: string;
  status: string;
}

export interface PMOverdueRow {
  id: string;
}

/**
 * Fetch preventative maintenance records and their overdue subset for a given
 * org. Queries the `preventative_maintenance` table (not work_orders) so that
 * the PM compliance donut chart reflects actual PM status distribution.
 */
export async function fetchPMComplianceData(organizationId: string) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const cutoff = twoYearsAgo.toISOString();

  const { data: pmRows, error: pmError } = await supabase
    .from('preventative_maintenance')
    .select('id, status, work_order_id')
    .eq('organization_id', organizationId)
    .not('template_id', 'is', null)
    .gte('created_at', cutoff);

  if (pmError) throw pmError;

  const allRows = pmRows ?? [];
  const activePMs = allRows.filter(r =>
    r.status === 'pending' || r.status === 'in_progress'
  );

  let overdueRows: PMOverdueRow[] = [];

  if (activePMs.length > 0) {
    const { data: pastDueWOs, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', activePMs.map(r => r.work_order_id))
      .not('due_date', 'is', null)
      .lt('due_date', new Date().toISOString());

    if (woError) throw woError;

    const pastDueIds = new Set((pastDueWOs ?? []).map(r => r.id));
    overdueRows = activePMs
      .filter(pm => pastDueIds.has(pm.work_order_id))
      .map(pm => ({ id: pm.id }));
  }

  return {
    rows: allRows.map(r => ({ id: r.id, status: r.status })),
    overdueRows,
  };
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

// ─── Dashboard Trends (issue #589) ──────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatTrend {
  /** Per-day values ordered oldest -> newest, length = requested days. */
  sparkline: number[];
  /** Integer percent change vs prior equal window, or null when prior = 0. */
  delta: number | null;
  direction: TrendDirection;
}

export interface DashboardTrends {
  totalEquipment: StatTrend;
  overdueWorkOrders: StatTrend;
  totalWorkOrders: StatTrend;
  needsAttention: StatTrend;
}

const emptyTrend = (days: number): StatTrend => ({
  sparkline: Array.from({ length: days }, () => 0),
  delta: null,
  direction: 'flat',
});

const emptyTrends = (days: number): DashboardTrends => ({
  totalEquipment: emptyTrend(days),
  overdueWorkOrders: emptyTrend(days),
  totalWorkOrders: emptyTrend(days),
  needsAttention: emptyTrend(days),
});

  /**
   * Fetch real historical trend data for the four dashboard KPIs via the
   * `get_dashboard_trends` RPC. Team scope and admin status are derived
   * entirely server-side from auth.uid() — no auth params are passed by the
   * caller (the RPC's SECURITY DEFINER contract prohibits caller-supplied
   * auth parameters).
   */
export async function fetchDashboardTrends(
    organizationId: string,
    days = 7
  ): Promise<DashboardTrends> {
    const { data, error } = await supabase.rpc('get_dashboard_trends', {
      p_org_id: organizationId,
      p_days: days,
    });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return emptyTrends(days);

  const toTrend = (
    series: number[] | null | undefined,
    delta: number | null | undefined,
    direction: string | null | undefined
  ): StatTrend => ({
    sparkline: Array.isArray(series) ? series.map((v) => Number(v) || 0) : [],
    delta: typeof delta === 'number' ? delta : null,
    direction:
      direction === 'up' || direction === 'down' || direction === 'flat'
        ? direction
        : 'flat',
  });

  return {
    totalEquipment: toTrend(
      row.total_equipment_series,
      row.total_equipment_delta,
      row.total_equipment_direction
    ),
    overdueWorkOrders: toTrend(
      row.overdue_work_series,
      row.overdue_work_delta,
      row.overdue_work_direction
    ),
    totalWorkOrders: toTrend(
      row.total_work_orders_series,
      row.total_work_orders_delta,
      row.total_work_orders_direction
    ),
    needsAttention: toTrend(
      row.needs_attention_series,
      row.needs_attention_delta,
      row.needs_attention_direction
    ),
  };
}

