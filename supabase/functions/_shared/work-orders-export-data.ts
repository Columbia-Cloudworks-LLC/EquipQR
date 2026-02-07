/**
 * Shared Work Orders Export Data Module
 * 
 * Contains types, helper functions, data fetching, and row building logic
 * that can be reused by both Excel export and Google Sheets export functions.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Maximum rows per export to prevent abuse.
 * 
 * IMPORTANT: If more work orders match the filters than this limit,
 * the export will be truncated to the most recent 5000 work orders.
 * Users should apply date range or other filters to reduce the result set
 * if they need complete data for a specific period.
 */
export const MAX_WORK_ORDERS = 5000;

// ============================================
// Types
// ============================================

export interface WorkOrderExcelFilters {
  status?: string;
  teamId?: string;
  priority?: string;
  assigneeId?: string;
  dateField: 'created_date' | 'completed_date';
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface ExportRequest {
  organizationId: string;
  filters: WorkOrderExcelFilters;
}

export interface WorkOrderSummaryRow {
  workOrderId: string;
  title: string;
  description: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  equipmentLocation: string;
  status: string;
  priority: string;
  createdDate: string;
  dueDate: string;
  completedDate: string;
  daysOpen: number | null;
  totalLaborHours: number;
  totalMaterialCost: number;
  pmStatus: string;
  assignee: string;
  team: string;
}

export interface LaborDetailRow {
  workOrderId: string;
  workOrderTitle: string;
  date: string;
  technician: string;
  hoursWorked: number;
  notes: string;
  hasPhotos: boolean;
  photoCount: number;
}

export interface MaterialCostRow {
  workOrderId: string;
  workOrderTitle: string;
  equipmentName: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fromInventory: boolean;
  dateAdded: string;
  addedBy: string;
}

export interface PMChecklistRow {
  workOrderId: string;
  workOrderTitle: string;
  equipmentName: string;
  pmStatus: string;
  completedDate: string;
  section: string;
  itemTitle: string;
  condition: number | null;
  conditionText: string;
  required: boolean;
  itemNotes: string;
  generalNotes: string;
}

export interface TimelineRow {
  workOrderId: string;
  workOrderTitle: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export interface EquipmentRow {
  equipmentId: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: string;
  workOrderCount: number;
  totalLaborHours: number;
  totalMaterialsCost: number;
}

export interface AllExportRows {
  summaryRows: WorkOrderSummaryRow[];
  laborRows: LaborDetailRow[];
  costRows: MaterialCostRow[];
  pmRows: PMChecklistRow[];
  timelineRows: TimelineRow[];
  equipmentRows: EquipmentRow[];
}

// ============================================
// Worksheet Configuration
// ============================================

export const WORKSHEET_NAMES = {
  SUMMARY: 'Summary',
  LABOR: 'Labor Detail',
  COSTS: 'Materials & Costs',
  PM_CHECKLISTS: 'PM Checklists',
  TIMELINE: 'Timeline',
  EQUIPMENT: 'Equipment',
} as const;

export const WORKSHEET_HEADERS = {
  SUMMARY: [
    'Work Order ID', 'Title', 'Description', 'Equipment', 'Serial Number',
    'Location', 'Status', 'Priority', 'Created Date', 'Due Date',
    'Completed Date', 'Days Open', 'Total Labor Hours', 'Total Material Cost',
    'PM Status', 'Assignee', 'Team',
  ],
  LABOR: [
    'Work Order ID', 'Work Order Title', 'Date', 'Technician',
    'Hours Worked', 'Notes', 'Has Photos', 'Photo Count',
  ],
  COSTS: [
    'Work Order ID', 'Work Order Title', 'Equipment', 'Item Description',
    'Quantity', 'Unit Price', 'Total Price', 'From Inventory', 'Date Added', 'Added By',
  ],
  PM_CHECKLISTS: [
    'Work Order ID', 'Work Order Title', 'Equipment', 'PM Status',
    'Completed Date', 'Section', 'Item Title', 'Condition', 'Condition Text',
    'Required', 'Item Notes', 'General Notes',
  ],
  TIMELINE: [
    'Work Order ID', 'Work Order Title', 'Previous Status', 'New Status',
    'Changed At', 'Changed By', 'Reason',
  ],
  EQUIPMENT: [
    'Equipment ID', 'Name', 'Manufacturer', 'Model', 'Serial Number',
    'Location', 'Status', 'Work Order Count', 'Total Labor Hours', 'Total Materials Cost',
  ],
} as const;

// ============================================
// Helper Functions
// ============================================

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return dateString;
  }
}

export function getConditionText(condition: number | null): string {
  if (condition === null) return 'Not Rated';
  switch (condition) {
    case 1: return 'OK';
    case 2: return 'Adjusted';
    case 3: return 'Recommend Repairs';
    case 4: return 'Requires Immediate Repairs';
    case 5: return 'Unsafe Condition Present';
    default: return 'Unknown';
  }
}

export function calculateDaysOpen(createdDate: string, completedDate: string | null): number | null {
  const created = new Date(createdDate);
  const end = completedDate ? new Date(completedDate) : new Date();
  return Math.floor((end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

// ============================================
// Rate Limiting
// ============================================

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { error: tableCheckError } = await supabase
    .from('export_request_log')
    .select('id')
    .limit(1);

  if (tableCheckError) {
    console.log('export_request_log table not found, skipping rate limit check');
    return true;
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: userCount } = await supabase
    .from('export_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('requested_at', oneMinuteAgo);

  if ((userCount ?? 0) >= 5) return false;

  const { count: orgCount } = await supabase
    .from('export_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('requested_at', oneHourAgo);

  if ((orgCount ?? 0) >= 50) return false;

  return true;
}

// ============================================
// Data Fetching
// ============================================

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
  let equipmentMap = new Map<string, { id: string; name: string; manufacturer: string | null; model: string | null; serial_number: string | null; location: string | null; status: string }>();
  if (equipmentIds.length > 0) {
    const { data: equipmentData } = await supabase
      .from('equipment')
      .select('id, name, manufacturer, model, serial_number, location, status')
      .in('id', equipmentIds)
      .eq('organization_id', organizationId);
    equipmentMap = new Map((equipmentData || []).map(e => [e.id, e]));
  }

  // Fetch teams data separately
  const teamIds = [...new Set(workOrders.map(wo => wo.team_id).filter(Boolean))];
  let teamMap = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
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
    history: history || [],
    equipmentMap,
    teamMap,
  };
}

// ============================================
// Data Transformation
// ============================================

export function buildAllRows(data: WorkOrdersWithData): AllExportRows {
  const summaryRows: WorkOrderSummaryRow[] = [];
  const laborRows: LaborDetailRow[] = [];
  const costRows: MaterialCostRow[] = [];
  const pmRows: PMChecklistRow[] = [];
  const timelineRows: TimelineRow[] = [];
  const equipmentAggMap = new Map<string, EquipmentRow>();

  for (const wo of data.workOrders) {
    const woNotes = data.notes.filter(n => n.work_order_id === wo.id);
    const woCosts = data.costs.filter(c => c.work_order_id === wo.id);
    const woPM = data.pmData.find(p => p.work_order_id === wo.id);
    const woHistory = data.history.filter(h => h.work_order_id === wo.id);

    // Get equipment from the map
    const equipment = wo.equipment_id ? data.equipmentMap.get(wo.equipment_id) : null;

    // Get team name from the map
    const teamName = wo.team_id ? data.teamMap.get(wo.team_id) : null;

    const totalLaborHours = woNotes.reduce((sum, n) => sum + (n.hours_worked || 0), 0);
    const totalMaterialCost = woCosts.reduce(
      (sum, c) => sum + (c.total_price_cents || c.quantity * c.unit_price_cents),
      0
    ) / 100;

    // Summary row
    summaryRows.push({
      workOrderId: truncateId(wo.id),
      title: wo.title,
      description: wo.description,
      equipmentName: equipment?.name || '',
      equipmentSerialNumber: equipment?.serial_number || '',
      equipmentLocation: equipment?.location || '',
      status: wo.status.replace(/_/g, ' ').toUpperCase(),
      priority: wo.priority.toUpperCase(),
      createdDate: formatDate(wo.created_date),
      dueDate: formatDate(wo.due_date),
      completedDate: formatDate(wo.completed_date),
      daysOpen: calculateDaysOpen(wo.created_date, wo.completed_date),
      totalLaborHours,
      totalMaterialCost,
      pmStatus: woPM?.status?.replace(/_/g, ' ').toUpperCase() || 'N/A',
      assignee: wo.assignee_name || 'Unassigned',
      team: teamName || 'Unassigned',
    });

    // Labor rows
    for (const note of woNotes) {
      laborRows.push({
        workOrderId: truncateId(wo.id),
        workOrderTitle: wo.title,
        date: formatDateTime(note.created_at),
        technician: note.author_name || 'Unknown',
        hoursWorked: note.hours_worked || 0,
        notes: note.content,
        hasPhotos: (note.image_count || 0) > 0,
        photoCount: note.image_count || 0,
      });
    }

    // Cost rows
    for (const cost of woCosts) {
      costRows.push({
        workOrderId: truncateId(wo.id),
        workOrderTitle: wo.title,
        equipmentName: equipment?.name || '',
        itemDescription: cost.description,
        quantity: cost.quantity,
        unitPrice: cost.unit_price_cents / 100,
        totalPrice: (cost.total_price_cents || cost.quantity * cost.unit_price_cents) / 100,
        fromInventory: !!cost.inventory_item_id,
        dateAdded: formatDateTime(cost.created_at),
        addedBy: cost.created_by_name || 'Unknown',
      });
    }

    // PM checklist rows
    if (woPM && woPM.checklist_data) {
      let checklistItems: Array<{
        section: string;
        title: string;
        condition: number | null;
        required: boolean;
        notes?: string;
      }> = [];
      let parseError: Error | null = null;

      const rawData = woPM.checklist_data;
      try {
        if (typeof rawData === 'string') {
          checklistItems = JSON.parse(rawData);
        } else if (Array.isArray(rawData)) {
          checklistItems = rawData;
        }
      } catch (error) {
        parseError = error instanceof Error ? error : new Error(String(error));
        const rawDataSnippet = typeof rawData === 'string' 
          ? rawData.substring(0, 200) 
          : String(rawData).substring(0, 200);
        
        console.error('Error parsing PM checklist data', {
          workOrderId: wo.id,
          workOrderTitle: wo.title,
          rawType: typeof rawData,
          rawDataLength: typeof rawData === 'string' ? rawData.length : 'N/A',
          rawDataSnippet,
          errorMessage: parseError.message,
          errorStack: parseError.stack,
        });
      }

      // If parsing failed, add a warning row to indicate the issue
      if (parseError) {
        pmRows.push({
          workOrderId: truncateId(wo.id),
          workOrderTitle: wo.title,
          equipmentName: equipment?.name || '',
          pmStatus: woPM.status?.replace(/_/g, ' ').toUpperCase() || '',
          completedDate: formatDateTime(woPM.completed_at),
          section: 'PARSE ERROR',
          itemTitle: 'Unable to parse checklist data',
          condition: null,
          conditionText: 'Not Rated',
          required: false,
          itemNotes: `Parse error: ${parseError.message}`,
          generalNotes: woPM.notes ? `${woPM.notes}\n\n[WARNING: Checklist data could not be parsed]` : '[WARNING: Checklist data could not be parsed]',
        });
      }

      for (const item of checklistItems) {
        pmRows.push({
          workOrderId: truncateId(wo.id),
          workOrderTitle: wo.title,
          equipmentName: equipment?.name || '',
          pmStatus: woPM.status?.replace(/_/g, ' ').toUpperCase() || '',
          completedDate: formatDateTime(woPM.completed_at),
          section: item.section,
          itemTitle: item.title,
          condition: item.condition,
          conditionText: getConditionText(item.condition),
          required: item.required,
          itemNotes: item.notes || '',
          generalNotes: woPM.notes || '',
        });
      }
    }

    // Timeline rows
    for (const event of woHistory) {
      const profiles = event.profiles as { name: string } | null;
      timelineRows.push({
        workOrderId: truncateId(wo.id),
        workOrderTitle: wo.title,
        previousStatus: event.old_status?.replace(/_/g, ' ').toUpperCase() || 'CREATED',
        newStatus: event.new_status.replace(/_/g, ' ').toUpperCase(),
        changedAt: formatDateTime(event.changed_at),
        changedBy: profiles?.name || 'System',
        reason: event.reason || '',
      });
    }

    // Equipment aggregation
    if (equipment) {
      const existing = equipmentAggMap.get(equipment.id);
      if (existing) {
        existing.workOrderCount += 1;
        existing.totalLaborHours += totalLaborHours;
        existing.totalMaterialsCost += totalMaterialCost;
      } else {
        equipmentAggMap.set(equipment.id, {
          equipmentId: truncateId(equipment.id),
          name: equipment.name,
          manufacturer: equipment.manufacturer || '',
          model: equipment.model || '',
          serialNumber: equipment.serial_number || '',
          location: equipment.location || '',
          status: equipment.status,
          workOrderCount: 1,
          totalLaborHours,
          totalMaterialsCost: totalMaterialCost,
        });
      }
    }
  }

  return {
    summaryRows,
    laborRows,
    costRows,
    pmRows,
    timelineRows,
    equipmentRows: Array.from(equipmentAggMap.values()),
  };
}

// ============================================
// Row Mappers for Sheets/Excel output
// ============================================

/**
 * Converts a summary row to an array of cell values for spreadsheet output.
 */
export function summaryRowToArray(row: WorkOrderSummaryRow): (string | number | null)[] {
  return [
    row.workOrderId, row.title, row.description, row.equipmentName,
    row.equipmentSerialNumber, row.equipmentLocation, row.status, row.priority,
    row.createdDate, row.dueDate, row.completedDate, row.daysOpen,
    row.totalLaborHours, row.totalMaterialCost, row.pmStatus, row.assignee, row.team,
  ];
}

export function laborRowToArray(row: LaborDetailRow): (string | number | boolean)[] {
  return [
    row.workOrderId, row.workOrderTitle, row.date, row.technician,
    row.hoursWorked, row.notes, row.hasPhotos ? 'Yes' : 'No', row.hasPhotos ? row.photoCount : '',
  ];
}

export function costRowToArray(row: MaterialCostRow): (string | number | boolean)[] {
  return [
    row.workOrderId, row.workOrderTitle, row.equipmentName, row.itemDescription,
    row.quantity, row.unitPrice, row.totalPrice, row.fromInventory ? 'Yes' : 'No',
    row.dateAdded, row.addedBy,
  ];
}

export function pmRowToArray(row: PMChecklistRow): (string | number | boolean | null)[] {
  return [
    row.workOrderId, row.workOrderTitle, row.equipmentName, row.pmStatus,
    row.completedDate, row.section, row.itemTitle, row.condition,
    row.conditionText, row.required ? 'Yes' : 'No', row.itemNotes, row.generalNotes,
  ];
}

export function timelineRowToArray(row: TimelineRow): string[] {
  return [
    row.workOrderId, row.workOrderTitle, row.previousStatus, row.newStatus,
    row.changedAt, row.changedBy, row.reason,
  ];
}

export function equipmentRowToArray(row: EquipmentRow): (string | number)[] {
  return [
    row.equipmentId, row.name, row.manufacturer, row.model, row.serialNumber,
    row.location, row.status, row.workOrderCount, row.totalLaborHours, row.totalMaterialsCost,
  ];
}
