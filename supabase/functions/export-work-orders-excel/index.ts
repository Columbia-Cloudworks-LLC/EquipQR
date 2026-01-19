/**
 * Export Work Orders Excel Edge Function
 * 
 * Generates a multi-worksheet Excel export for work orders with all related data.
 * Uses SheetJS (xlsx) for Excel generation.
 * Uses user-scoped client so RLS policies apply.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Maximum rows per export to prevent abuse
const MAX_WORK_ORDERS = 5000;

// ============================================
// Types
// ============================================

interface WorkOrderExcelFilters {
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

interface ExportRequest {
  organizationId: string;
  filters: WorkOrderExcelFilters;
}

interface WorkOrderSummaryRow {
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

interface LaborDetailRow {
  workOrderId: string;
  workOrderTitle: string;
  date: string;
  technician: string;
  hoursWorked: number;
  notes: string;
  hasPhotos: boolean;
  photoCount: number;
}

interface MaterialCostRow {
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

interface PMChecklistRow {
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

interface TimelineRow {
  workOrderId: string;
  workOrderTitle: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

interface EquipmentRow {
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

// ============================================
// Worksheet Configuration
// ============================================

const WORKSHEET_NAMES = {
  SUMMARY: 'Summary',
  LABOR: 'Labor Detail',
  COSTS: 'Materials & Costs',
  PM_CHECKLISTS: 'PM Checklists',
  TIMELINE: 'Timeline',
  EQUIPMENT: 'Equipment',
};

const WORKSHEET_HEADERS = {
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
};

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return dateString;
  }
}

function getConditionText(condition: number | null): string {
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

function calculateDaysOpen(createdDate: string, completedDate: string | null): number | null {
  const created = new Date(createdDate);
  const end = completedDate ? new Date(completedDate) : new Date();
  return Math.floor((end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

// ============================================
// Rate Limiting
// ============================================

// NOTE: supabase client is now created per-request (see serve function below)
let supabase: SupabaseClient;

async function checkRateLimit(userId: string, organizationId: string): Promise<boolean> {
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

async function fetchWorkOrdersWithData(
  organizationId: string,
  filters: WorkOrderExcelFilters
) {
  // Build work orders query (avoiding embedded relationships due to schema cache issues)
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
    return { workOrders: [], notes: [], costs: [], pmData: [], history: [], equipmentMap: new Map(), teamMap: new Map() };
  }

  const workOrderIds = workOrders.map(wo => wo.id);

  // Fetch equipment data separately
  const equipmentIds = [...new Set(workOrders.map(wo => wo.equipment_id).filter(Boolean))];
  let equipmentMap = new Map<string, { id: string; name: string; manufacturer: string | null; model: string | null; serial_number: string | null; location: string | null; status: string }>();
  if (equipmentIds.length > 0) {
    const { data: equipmentData } = await supabase
      .from('equipment')
      .select('id, name, manufacturer, model, serial_number, location, status')
      .in('id', equipmentIds);
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
  const { data: notes } = await supabase
    .from('work_order_notes')
    .select('*')
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
  const { data: costs } = await supabase
    .from('work_order_costs')
    .select('*')
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
  const { data: pmData } = await supabase
    .from('preventative_maintenance')
    .select('work_order_id, status, completed_at, notes, checklist_data')
    .in('work_order_id', workOrderIds);

  // Fetch status history
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

function buildAllRows(data: Awaited<ReturnType<typeof fetchWorkOrdersWithData>>) {
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

      try {
        const rawData = woPM.checklist_data;
        if (typeof rawData === 'string') {
          checklistItems = JSON.parse(rawData);
        } else if (Array.isArray(rawData)) {
          checklistItems = rawData;
        }
      } catch {
        console.error('Error parsing PM checklist data');
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
// Worksheet Generation
// ============================================

function createWorksheet<T>(
  headers: string[],
  rows: T[],
  rowMapper: (row: T) => (string | number | boolean | null)[]
): XLSX.WorkSheet {
  const data = [
    headers,
    ...rows.map(rowMapper),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Calculate column widths
  const colWidths = headers.map((header, colIndex) => {
    let maxWidth = header.length;
    rows.forEach(row => {
      const cellValue = rowMapper(row)[colIndex];
      const cellLength = String(cellValue ?? '').length;
      if (cellLength > maxWidth) maxWidth = cellLength;
    });
    return { wch: Math.min(maxWidth + 2, 50) };
  });

  worksheet['!cols'] = colWidths;

  return worksheet;
}

function generateWorkbook(allRows: ReturnType<typeof buildAllRows>): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summarySheet = createWorksheet(
    WORKSHEET_HEADERS.SUMMARY,
    allRows.summaryRows,
    (row) => [
      row.workOrderId, row.title, row.description, row.equipmentName,
      row.equipmentSerialNumber, row.equipmentLocation, row.status, row.priority,
      row.createdDate, row.dueDate, row.completedDate, row.daysOpen,
      row.totalLaborHours, row.totalMaterialCost, row.pmStatus, row.assignee, row.team,
    ]
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, WORKSHEET_NAMES.SUMMARY);

  // Labor sheet
  const laborSheet = createWorksheet(
    WORKSHEET_HEADERS.LABOR,
    allRows.laborRows,
    (row) => [
      row.workOrderId, row.workOrderTitle, row.date, row.technician,
      row.hoursWorked, row.notes, row.hasPhotos ? 'Yes' : 'No', row.hasPhotos ? row.photoCount : '',
    ]
  );
  XLSX.utils.book_append_sheet(workbook, laborSheet, WORKSHEET_NAMES.LABOR);

  // Costs sheet
  const costsSheet = createWorksheet(
    WORKSHEET_HEADERS.COSTS,
    allRows.costRows,
    (row) => [
      row.workOrderId, row.workOrderTitle, row.equipmentName, row.itemDescription,
      row.quantity, row.unitPrice, row.totalPrice, row.fromInventory ? 'Yes' : 'No',
      row.dateAdded, row.addedBy,
    ]
  );
  // Add totals row
  if (allRows.costRows.length > 0) {
    const totalQty = allRows.costRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalCost = allRows.costRows.reduce((sum, r) => sum + r.totalPrice, 0);
    XLSX.utils.sheet_add_aoa(
      costsSheet,
      [['', '', '', 'TOTAL', totalQty, '', totalCost, '', '', '']],
      { origin: -1 }
    );
  }
  XLSX.utils.book_append_sheet(workbook, costsSheet, WORKSHEET_NAMES.COSTS);

  // PM Checklists sheet
  if (allRows.pmRows.length > 0) {
    const pmSheet = createWorksheet(
      WORKSHEET_HEADERS.PM_CHECKLISTS,
      allRows.pmRows,
      (row) => [
        row.workOrderId, row.workOrderTitle, row.equipmentName, row.pmStatus,
        row.completedDate, row.section, row.itemTitle, row.condition,
        row.conditionText, row.required ? 'Yes' : 'No', row.itemNotes, row.generalNotes,
      ]
    );
    XLSX.utils.book_append_sheet(workbook, pmSheet, WORKSHEET_NAMES.PM_CHECKLISTS);
  }

  // Timeline sheet
  const timelineSheet = createWorksheet(
    WORKSHEET_HEADERS.TIMELINE,
    allRows.timelineRows,
    (row) => [
      row.workOrderId, row.workOrderTitle, row.previousStatus, row.newStatus,
      row.changedAt, row.changedBy, row.reason,
    ]
  );
  XLSX.utils.book_append_sheet(workbook, timelineSheet, WORKSHEET_NAMES.TIMELINE);

  // Equipment sheet
  const equipmentSheet = createWorksheet(
    WORKSHEET_HEADERS.EQUIPMENT,
    allRows.equipmentRows,
    (row) => [
      row.equipmentId, row.name, row.manufacturer, row.model, row.serialNumber,
      row.location, row.status, row.workOrderCount, row.totalLaborHours, row.totalMaterialsCost,
    ]
  );
  XLSX.utils.book_append_sheet(workbook, equipmentSheet, WORKSHEET_NAMES.EQUIPMENT);

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Create user-scoped client (RLS enforced)
    supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;

    const body: ExportRequest = await req.json();
    const { organizationId, filters } = body;

    if (!organizationId) {
      return createErrorResponse('Missing required field: organizationId', 400);
    }

    // Verify user has admin/owner role in the organization (RLS also applies)
    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse('Forbidden: Only owners and admins can export reports', 403);
    }

    // Check rate limit
    const rateLimitOk = await checkRateLimit(user.id, organizationId);
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before requesting another export.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log export request
    const { data: exportLog } = await supabase
      .from('export_request_log')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        report_type: 'work-orders-detailed',
        row_count: 0,
        status: 'pending',
      })
      .select('id')
      .single();

    const exportLogId = exportLog?.id;

    try {
      // Fetch all data
      const data = await fetchWorkOrdersWithData(organizationId, filters);

      if (data.workOrders.length === 0) {
        if (exportLogId) {
          await supabase
            .from('export_request_log')
            .update({ status: 'completed', row_count: 0, completed_at: new Date().toISOString() })
            .eq('id', exportLogId);
        }
        return new Response(
          JSON.stringify({ error: 'No work orders found matching the filters' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build all worksheet data
      const allRows = buildAllRows(data);

      // Generate workbook
      const xlsxBuffer = generateWorkbook(allRows);

      // Update export log
      if (exportLogId) {
        await supabase
          .from('export_request_log')
          .update({
            status: 'completed',
            row_count: data.workOrders.length,
            completed_at: new Date().toISOString(),
          })
          .eq('id', exportLogId);
      }

      // Return Excel file
      const dateStr = new Date().toISOString().split('T')[0];
      return new Response(xlsxBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="work-orders-export-${dateStr}.xlsx"`,
        },
      });
    } catch (exportError) {
      if (exportLogId) {
        await supabase
          .from('export_request_log')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', exportLogId);
      }
      throw exportError;
    }
  } catch (error) {
    // Log the full error server-side for debugging
    console.error('[EXPORT-WORK-ORDERS-EXCEL] Export error:', error);
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
