/**
 * Data fetching for single work order Google Doc packets.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export interface SingleWorkOrderGoogleDocFetchResult {
  workOrder: {
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
  };
  organization: { name: string; logo: string | null } | null;
  teamData: { name: string | null; imageUrl: string | null };
  equipmentData: {
    name: string | null;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    location: string | null;
  };
  customerName: string | null;
  notesWithNames: Array<{
    id: string;
    work_order_id: string;
    content: string;
    created_at: string;
    author_id: string;
    hours_worked: number | null;
    is_private: boolean;
    author_name: string;
  }>;
  images: Array<{
    id: string;
    work_order_id: string;
    note_id: string | null;
    file_name: string;
    file_url: string | null;
    mime_type: string | null;
  }>;
  rawCosts: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_price_cents: number | null;
    inventory_item_id: string | null;
    created_at: string;
    created_by: string;
  }>;
  historyData: Array<{
    old_status: string | null;
    new_status: string;
    changed_at: string;
    reason: string | null;
    profiles: { name: string } | null;
  }>;
  pmData: {
    status: string | null;
    completed_at: string | null;
    notes: string | null;
    checklist_data: unknown;
  } | null;
  costCreatorMap: Map<string, string>;
}

export async function fetchSingleWorkOrderGoogleDocData(
  supabase: SupabaseClient,
  organizationId: string,
  workOrderId: string,
): Promise<SingleWorkOrderGoogleDocFetchResult> {
  // 1. Fetch the work order and verify it belongs to the org
  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .select(`
      id, title, description, status, priority,
      created_date, due_date, completed_date,
      assignee_name, has_pm, team_id, equipment_id
    `)
    .eq('id', workOrderId)
    .eq('organization_id', organizationId)
    .single();

  if (woError || !workOrder) {
    throw new Error(
      `Work order not found or does not belong to organization: ${woError?.message ?? 'not found'}`,
    );
  }

  // 2. Fetch org row for name and logo
  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo')
    .eq('id', organizationId)
    .single();

  // 3. If work order has team_id, fetch team name and image_url
  // Defense in depth: teams table has organization_id, so we add explicit filter
  let teamData: { name: string | null; imageUrl: string | null } = { name: null, imageUrl: null };
  if (workOrder.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name, image_url')
      .eq('id', workOrder.team_id)
      .eq('organization_id', organizationId)
      .single();
    if (team) {
      teamData = { name: team.name, imageUrl: team.image_url };
    }
  }

  // 4. If work order has equipment_id, fetch equipment details AND customer name
  let equipmentData = {
    name: null as string | null,
    manufacturer: null as string | null,
    model: null as string | null,
    serialNumber: null as string | null,
    location: null as string | null,
  };
  let customerName: string | null = null;

  if (workOrder.equipment_id) {
    const { data: equipment } = await supabase
      .from('equipment')
      .select('name, manufacturer, model, serial_number, location, customer_id')
      .eq('id', workOrder.equipment_id)
      .eq('organization_id', organizationId)
      .single();

    if (equipment) {
      equipmentData = {
        name: equipment.name,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serialNumber: equipment.serial_number,
        location: equipment.location,
      };
      if (equipment.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', equipment.customer_id)
          .eq('organization_id', organizationId)
          .single();
        customerName = customer?.name ?? null;
      }
    }
  }

  // 5. Fetch public notes ordered by created_at ASC
  // Defense in depth: work_order_notes does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_notes enforce access through work_order ownership.
  const { data: publicNotes } = await supabase
    .from('work_order_notes')
    .select('id, work_order_id, content, created_at, author_id, hours_worked, is_private, author_name')
    .eq('work_order_id', workOrderId)
    .eq('is_private', false)
    .order('created_at', { ascending: true });

  const notes = publicNotes || [];

  // Resolve author names from profiles for notes missing author_name
  const authorIdsNeedingLookup = [...new Set(
    notes.filter(n => !n.author_name).map(n => n.author_id),
  )];
  let authorMap = new Map<string, string>();
  if (authorIdsNeedingLookup.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIdsNeedingLookup);
    authorMap = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
  }

  const notesWithNames = notes.map(n => ({
    ...n,
    author_name: n.author_name || authorMap.get(n.author_id) || 'Unknown',
  }));

  // 6. Fetch ALL work_order_images for the work order
  // Defense in depth: work_order_images does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_images enforce access through work_order ownership.
  const { data: allImages } = await supabase
    .from('work_order_images')
    .select('id, work_order_id, note_id, file_name, file_url, mime_type')
    .eq('work_order_id', workOrderId);

  const images = allImages || [];

  // 10. Build costs from work_order_costs with creator names
  // Defense in depth: work_order_costs does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_costs enforce access through work_order ownership.
  const { data: costData } = await supabase
    .from('work_order_costs')
    .select('id, description, quantity, unit_price_cents, total_price_cents, inventory_item_id, created_at, created_by')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  const rawCosts = costData || [];
  const costCreatorIds = [...new Set(rawCosts.map(c => c.created_by))];
  let costCreatorMap = new Map<string, string>();
  if (costCreatorIds.length > 0) {
    const { data: costProfiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', costCreatorIds);
    costCreatorMap = new Map(
      (costProfiles || []).map((p: { id: string; name: string }) => [p.id, p.name]),
    );
  }

  // 11. Build timeline from work_order_status_history with changer names
  // Defense in depth: work_order_status_history does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_status_history enforce access through work_order ownership.
  const { data: historyData } = await supabase
    .from('work_order_status_history')
    .select(`
      old_status, new_status, changed_at, reason,
      profiles:changed_by ( name )
    `)
    .eq('work_order_id', workOrderId)
    .order('changed_at', { ascending: true });

  // 12. Build PM checklist data (same parsing as existing export module)
  let pmData: SingleWorkOrderGoogleDocFetchResult['pmData'] = null;

  if (workOrder.has_pm) {
    // Defense in depth: preventative_maintenance has organization_id, so we add explicit filter
    const { data: pmRow } = await supabase
      .from('preventative_maintenance')
      .select('status, completed_at, notes, checklist_data')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (pmRow) {
      pmData = pmRow;
    }
  }

  return {
    workOrder,
    organization: org,
    teamData,
    equipmentData,
    customerName,
    notesWithNames,
    images,
    rawCosts,
    historyData: (historyData || []).map(h => ({
      old_status: h.old_status,
      new_status: h.new_status,
      changed_at: h.changed_at,
      reason: h.reason,
      profiles: h.profiles as unknown as { name: string } | null,
    })),
    pmData,
    costCreatorMap,
  };
}
