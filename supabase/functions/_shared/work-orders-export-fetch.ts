/**
 * Work orders export data fetching.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import type { WorkOrderExcelFilters } from "./work-orders-export-data.ts";

/**
 * Maximum rows per export to prevent abuse.
 *
 * IMPORTANT: If more work orders match the filters than this limit,
 * the export will be truncated to the most recent 5000 work orders.
 * Users should apply date range or other filters to reduce the result set
 * if they need complete data for a specific period.
 */
export const MAX_WORK_ORDERS = 5000;

export interface WorkOrdersWithData {
  workOrders: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_date: string;
    due_date: string | null;
    completed_date: string | null;
    assignee_name: string | null;
    has_pm: boolean;
    team_id: string | null;
    equipment_id: string | null;
  }>;
  notes: Array<{
    id: string;
    work_order_id: string;
    content: string;
    created_at: string;
    author_id: string;
    hours_worked: number | null;
    is_private: boolean;
    author_name: string;
    image_count: number;
  }>;
  costs: Array<{
    id: string;
    work_order_id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_price_cents: number | null;
    inventory_item_id: string | null;
    created_at: string;
    created_by: string;
    created_by_name: string;
  }>;
  pmData: Array<{
    work_order_id: string;
    status: string | null;
    completed_at: string | null;
    notes: string | null;
    checklist_data: unknown;
  }>;
  history: Array<{
    work_order_id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
    reason: string | null;
    profiles: { name: string } | null;
  }>;
  equipmentMap: Map<string, {
    id: string;
    name: string;
    customer_id: string | null;
    customer_name: string;
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    location: string | null;
    status: string;
  }>;
  teamMap: Map<string, string>;
}

export async function fetchWorkOrdersWithData(
  supabase: SupabaseClient,
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<WorkOrdersWithData> {
  // Build work orders query (avoiding embedded relationships due to schema cache issues)
  // NOTE: Results are capped at MAX_WORK_ORDERS (5000) to prevent abuse.
  // If more work orders match the filters, only the most recent 5000 are returned.
  let query = supabase
    .from('work_orders')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      created_date,
      due_date,
      completed_date,
      assignee_name,
      has_pm,
      team_id,
      equipment_id
    `)
    .eq('organization_id', organizationId)
    .limit(MAX_WORK_ORDERS);

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
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
  if (filters.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }

  // Apply date filters
  const dateField = filters.dateField || 'created_date';
  if (filters.dateRange?.from) {
    query = query.gte(dateField, filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte(dateField, filters.dateRange.to);
  }

  query = query.order('created_date', { ascending: false });

  const { data: workOrders, error } = await query;

  if (error) throw new Error(`Failed to fetch work orders: ${error.message}`);
  if (!workOrders || workOrders.length === 0) {
    return {
      workOrders: [],
      notes: [],
      costs: [],
      pmData: [],
      history: [],
      equipmentMap: new Map(),
      teamMap: new Map(),
    };
  }

  const workOrderIds = workOrders.map(wo => wo.id);

  // Fetch equipment data separately
  const equipmentIds = [...new Set(workOrders.map(wo => wo.equipment_id).filter(Boolean))];
  let equipmentMap = new Map<string, { id: string; name: string; customer_id: string | null; customer_name: string; manufacturer: string | null; model: string | null; serial_number: string | null; location: string | null; status: string }>();
  if (equipmentIds.length > 0) {
    const { data: equipmentData } = await supabase
      .from('equipment')
      .select('id, name, customer_id, manufacturer, model, serial_number, location, status')
      .in('id', equipmentIds)
      .eq('organization_id', organizationId);

    const customerIds = [...new Set((equipmentData || []).map(e => e.customer_id).filter(Boolean))];
    let customerNameMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('organization_id', organizationId)
        .in('id', customerIds);
      customerNameMap = new Map((customerData || []).map(c => [c.id, c.name]));
    }

    equipmentMap = new Map((equipmentData || []).map(e => [
      e.id,
      {
        ...e,
        customer_name: e.customer_id ? (customerNameMap.get(e.customer_id) || '') : '',
      },
    ]));
  }

  // Fetch teams data separately
  // Defense in depth: teams table has organization_id column, so we add explicit filter
  const teamIds = [...new Set(workOrders.map(wo => wo.team_id).filter(Boolean))];
  let teamMap = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds)
      .eq('organization_id', organizationId);
    teamMap = new Map((teamsData || []).map(t => [t.id, t.name]));
  }

  // Fetch notes
  // Defense in depth: work_order_notes table does not have organization_id column.
  // Security is ensured by: (1) workOrderIds are already filtered by organization_id above,
  // and (2) RLS policies on work_order_notes enforce access through work_order ownership.
  const { data: notes } = await supabase
    .from('work_order_notes')
    .select('id, work_order_id, content, created_at, author_id, hours_worked, is_private')
    .in('work_order_id', workOrderIds)
    .eq('is_private', false)
    .order('created_at', { ascending: true });

  // Get author names
  const authorIds = [...new Set((notes || []).map(n => n.author_id))];
  let authorMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIds);
    authorMap = new Map((profiles || []).map(p => [p.id, p.name]));
  }

  // Fetch image counts
  // Defense in depth: work_order_images table does not have organization_id column.
  // Security is ensured by: (1) workOrderIds are already filtered by organization_id above,
  // and (2) RLS policies on work_order_images enforce access through work_order ownership.
  const { data: images } = await supabase
    .from('work_order_images')
    .select('note_id')
    .in('work_order_id', workOrderIds);

  const imageCountMap = new Map<string, number>();
  (images || []).forEach(img => {
    if (img.note_id) {
      imageCountMap.set(img.note_id, (imageCountMap.get(img.note_id) || 0) + 1);
    }
  });

  // Fetch costs
  // Defense in depth: work_order_costs table does not have organization_id column.
  // Security is ensured by: (1) workOrderIds are already filtered by organization_id above,
  // and (2) RLS policies on work_order_costs enforce access through work_order ownership.
  const { data: costs } = await supabase
    .from('work_order_costs')
    .select('id, work_order_id, description, quantity, unit_price_cents, total_price_cents, inventory_item_id, created_at, created_by')
    .in('work_order_id', workOrderIds)
    .order('created_at', { ascending: true });

  // Get cost creator names
  const costCreatorIds = [...new Set((costs || []).map(c => c.created_by))];
  let costCreatorMap = new Map<string, string>();
  if (costCreatorIds.length > 0) {
    const { data: costProfiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', costCreatorIds);
    costCreatorMap = new Map((costProfiles || []).map(p => [p.id, p.name]));
  }

  // Fetch PM data
  // Defense in depth: preventative_maintenance has organization_id column, so we add explicit filter
  const { data: pmData } = await supabase
    .from('preventative_maintenance')
    .select('work_order_id, status, completed_at, notes, checklist_data')
    .eq('organization_id', organizationId)
    .in('work_order_id', workOrderIds);

  // Fetch status history
  // Defense in depth: work_order_status_history table does not have organization_id column.
  // Security is ensured by: (1) workOrderIds are already filtered by organization_id above,
  // and (2) RLS policies on work_order_status_history enforce access through work_order ownership.
  const { data: history } = await supabase
    .from('work_order_status_history')
    .select(`
      work_order_id,
      old_status,
      new_status,
      changed_at,
      reason,
      profiles:changed_by (
        name
      )
    `)
    .in('work_order_id', workOrderIds)
    .order('changed_at', { ascending: true });

  return {
    workOrders,
    notes: (notes || []).map(n => ({
      ...n,
      author_name: authorMap.get(n.author_id) || 'Unknown',
      image_count: imageCountMap.get(n.id) || 0,
    })),
    costs: (costs || []).map(c => ({
      ...c,
      created_by_name: costCreatorMap.get(c.created_by) || 'Unknown',
    })),
    pmData: pmData || [],
    history: (history || []) as unknown as WorkOrdersWithData['history'],
    equipmentMap,
    teamMap,
  };
}
