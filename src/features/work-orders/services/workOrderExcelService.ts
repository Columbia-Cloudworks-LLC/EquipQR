/**
 * Work Order Excel Export Service
 * 
 * Client-side service for generating multi-worksheet Excel exports
 * for single work orders. Uses SheetJS (xlsx) library.
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import {
  WorkOrderSummaryRow,
  LaborDetailRow,
  MaterialCostRow,
  PMChecklistRow,
  TimelineRow,
  EquipmentRow,
  WORKSHEET_NAMES,
  WORKSHEET_HEADERS,
  getConditionText,
  PMCondition,
} from '@/features/work-orders/types/workOrderExcel';
import type { WorkOrderNote } from '@/features/work-orders/services/workOrderNotesService';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

// ============================================
// Data Fetching
// ============================================

interface WorkOrderFullData {
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
    equipment: {
      id: string;
      name: string;
      manufacturer: string | null;
      model: string | null;
      serial_number: string | null;
      location: string | null;
      status: string;
    } | null;
    teams: {
      name: string;
    } | null;
  };
  notes: WorkOrderNote[];
  costs: WorkOrderCost[];
  pmData: {
    id: string;
    status: string;
    completed_at: string | null;
    notes: string | null;
    checklist_data: unknown;
  } | null;
  history: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
    reason: string | null;
    profiles: { name: string } | null;
  }>;
}

/**
 * Fetch all data needed for a single work order export
 */
async function fetchWorkOrderData(
  workOrderId: string,
  organizationId: string
): Promise<WorkOrderFullData | null> {
  try {
    // Fetch work order with equipment and team
    const { data: workOrder, error: woError } = await supabase
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
        equipment:equipment_id (
          id,
          name,
          manufacturer,
          model,
          serial_number,
          location,
          status
        ),
        teams:team_id (
          name
        )
      `)
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (woError || !workOrder) {
      logger.error('Failed to fetch work order:', woError);
      return null;
    }

    // Fetch notes
    const { data: notes } = await supabase
      .from('work_order_notes')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    // Get author names for notes
    const authorIds = [...new Set((notes || []).map(n => n.author_id))];
    let notesWithAuthors: WorkOrderNote[] = [];
    
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      
      // Get image counts per note
      const { data: images } = await supabase
        .from('work_order_images')
        .select('note_id')
        .eq('work_order_id', workOrderId);
      
      const imageCountMap = new Map<string, number>();
      (images || []).forEach(img => {
        if (img.note_id) {
          imageCountMap.set(img.note_id, (imageCountMap.get(img.note_id) || 0) + 1);
        }
      });

      notesWithAuthors = (notes || []).map(note => ({
        ...note,
        author_name: profileMap.get(note.author_id) || 'Unknown',
        images: [], // Not needed for Excel export
      }));
    }

    // Fetch costs
    const { data: costs } = await supabase
      .from('work_order_costs')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    // Get creator names for costs
    const costCreatorIds = [...new Set((costs || []).map(c => c.created_by))];
    let costsWithCreators: WorkOrderCost[] = [];
    
    if (costCreatorIds.length > 0) {
      const { data: costProfiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', costCreatorIds);
      
      const costProfileMap = new Map(costProfiles?.map(p => [p.id, p.name]) || []);
      
      costsWithCreators = (costs || []).map(cost => ({
        ...cost,
        created_by_name: costProfileMap.get(cost.created_by) || 'Unknown',
      }));
    }

    // Fetch PM data if work order has PM
    let pmData = null;
    if (workOrder.has_pm) {
      const { data: pm } = await supabase
        .from('preventative_maintenance')
        .select('id, status, completed_at, notes, checklist_data')
        .eq('work_order_id', workOrderId)
        .single();
      
      pmData = pm;
    }

    // Fetch status history
    const { data: history } = await supabase
      .from('work_order_status_history')
      .select(`
        id,
        old_status,
        new_status,
        changed_at,
        reason,
        profiles:changed_by (
          name
        )
      `)
      .eq('work_order_id', workOrderId)
      .order('changed_at', { ascending: true });

    return {
      workOrder: workOrder as WorkOrderFullData['workOrder'],
      notes: notesWithAuthors,
      costs: costsWithCreators,
      pmData,
      history: (history || []) as WorkOrderFullData['history'],
    };
  } catch (error) {
    logger.error('Error fetching work order data for Excel export:', error);
    return null;
  }
}

// ============================================
// Data Transformation
// ============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'yyyy-MM-dd');
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
  } catch {
    return dateString;
  }
}

function calculateDaysOpen(createdDate: string, completedDate: string | null): number | null {
  if (!completedDate) {
    // Calculate days from creation to now
    const created = new Date(createdDate);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }
  const created = new Date(createdDate);
  const completed = new Date(completedDate);
  return Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function buildSummaryRow(
  data: WorkOrderFullData
): WorkOrderSummaryRow {
  const { workOrder, notes, costs, pmData } = data;
  
  const totalLaborHours = notes.reduce((sum, note) => sum + (note.hours_worked || 0), 0);
  const totalMaterialCost = costs.reduce(
    (sum, cost) => sum + (cost.total_price_cents || cost.quantity * cost.unit_price_cents),
    0
  ) / 100;

  return {
    workOrderId: workOrder.id.slice(0, 4) + '...' + workOrder.id.slice(-4),
    title: workOrder.title,
    description: workOrder.description,
    equipmentName: workOrder.equipment?.name || '',
    equipmentSerialNumber: workOrder.equipment?.serial_number || '',
    equipmentLocation: workOrder.equipment?.location || '',
    status: workOrder.status.replace(/_/g, ' ').toUpperCase(),
    priority: workOrder.priority.toUpperCase(),
    createdDate: formatDate(workOrder.created_date),
    dueDate: formatDate(workOrder.due_date),
    completedDate: formatDate(workOrder.completed_date),
    daysOpen: calculateDaysOpen(workOrder.created_date, workOrder.completed_date),
    totalLaborHours,
    totalMaterialCost,
    pmStatus: pmData?.status?.replace(/_/g, ' ').toUpperCase() || 'N/A',
    assignee: workOrder.assignee_name || 'Unassigned',
    team: workOrder.teams?.name || 'Unassigned',
  };
}

function buildLaborRows(data: WorkOrderFullData): LaborDetailRow[] {
  const { workOrder, notes } = data;
  
  // Get image counts for notes
  return notes
    .filter(note => !note.is_private)
    .map(note => ({
      workOrderId: workOrder.id.slice(0, 4) + '...' + workOrder.id.slice(-4),
      workOrderTitle: workOrder.title,
      date: formatDateTime(note.created_at),
      technician: note.author_name || 'Unknown',
      hoursWorked: note.hours_worked || 0,
      notes: note.content,
      hasPhotos: (note.images?.length || 0) > 0,
      photoCount: note.images?.length || 0,
    }));
}

function buildCostRows(data: WorkOrderFullData): MaterialCostRow[] {
  const { workOrder, costs } = data;
  
  return costs.map(cost => ({
    workOrderId: workOrder.id.slice(0, 4) + '...' + workOrder.id.slice(-4),
    workOrderTitle: workOrder.title,
    equipmentName: workOrder.equipment?.name || '',
    itemDescription: cost.description,
    quantity: cost.quantity,
    unitPrice: cost.unit_price_cents / 100,
    totalPrice: (cost.total_price_cents || cost.quantity * cost.unit_price_cents) / 100,
    fromInventory: !!cost.inventory_item_id,
    dateAdded: formatDateTime(cost.created_at),
    addedBy: cost.created_by_name || 'Unknown',
  }));
}

function buildPMChecklistRows(data: WorkOrderFullData): PMChecklistRow[] {
  const { workOrder, pmData } = data;
  
  if (!pmData || !pmData.checklist_data) {
    return [];
  }

  let checklistItems: PMChecklistItem[] = [];
  try {
    const rawData = pmData.checklist_data;
    if (typeof rawData === 'string') {
      checklistItems = JSON.parse(rawData);
    } else if (Array.isArray(rawData)) {
      checklistItems = rawData as unknown as PMChecklistItem[];
    }
  } catch (error) {
    logger.error('Error parsing PM checklist data:', error);
    return [];
  }

  return checklistItems.map(item => ({
    workOrderId: workOrder.id.slice(0, 4) + '...' + workOrder.id.slice(-4),
    workOrderTitle: workOrder.title,
    equipmentName: workOrder.equipment?.name || '',
    pmStatus: pmData.status?.replace(/_/g, ' ').toUpperCase() || '',
    completedDate: formatDateTime(pmData.completed_at),
    section: item.section,
    itemTitle: item.title,
    condition: item.condition as PMCondition,
    conditionText: getConditionText(item.condition as PMCondition),
    required: item.required,
    itemNotes: item.notes || '',
    generalNotes: pmData.notes || '',
  }));
}

function buildTimelineRows(data: WorkOrderFullData): TimelineRow[] {
  const { workOrder, history } = data;
  
  return history.map(event => ({
    workOrderId: workOrder.id.slice(0, 4) + '...' + workOrder.id.slice(-4),
    workOrderTitle: workOrder.title,
    previousStatus: event.old_status?.replace(/_/g, ' ').toUpperCase() || 'CREATED',
    newStatus: event.new_status.replace(/_/g, ' ').toUpperCase(),
    changedAt: formatDateTime(event.changed_at),
    changedBy: event.profiles?.name || 'System',
    reason: event.reason || '',
  }));
}

function buildEquipmentRow(data: WorkOrderFullData): EquipmentRow | null {
  const { workOrder, notes, costs } = data;
  
  if (!workOrder.equipment) {
    return null;
  }

  const totalLaborHours = notes.reduce((sum, note) => sum + (note.hours_worked || 0), 0);
  const totalMaterialsCost = costs.reduce(
    (sum, cost) => sum + (cost.total_price_cents || cost.quantity * cost.unit_price_cents),
    0
  ) / 100;

  return {
    equipmentId: workOrder.equipment.id.slice(0, 4) + '...' + workOrder.equipment.id.slice(-4),
    name: workOrder.equipment.name,
    manufacturer: workOrder.equipment.manufacturer || '',
    model: workOrder.equipment.model || '',
    serialNumber: workOrder.equipment.serial_number || '',
    location: workOrder.equipment.location || '',
    status: workOrder.equipment.status,
    workOrderCount: 1,
    totalLaborHours,
    totalMaterialsCost,
  };
}

// ============================================
// Worksheet Building
// ============================================

function createWorksheet<T extends Record<string, unknown>>(
  headers: readonly string[],
  rows: T[],
  rowMapper: (row: T) => (string | number | boolean | null)[]
): XLSX.WorkSheet {
  const data: (string | number | boolean | null)[][] = [
    [...headers],
    ...rows.map(rowMapper),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Calculate column widths based on content
  const colWidths = headers.map((header, colIndex) => {
    let maxWidth = header.length;
    rows.forEach(row => {
      const cellValue = rowMapper(row)[colIndex];
      const cellLength = String(cellValue ?? '').length;
      if (cellLength > maxWidth) {
        maxWidth = cellLength;
      }
    });
    return { wch: Math.min(maxWidth + 2, 50) };
  });

  worksheet['!cols'] = colWidths;

  return worksheet;
}

function buildSummarySheet(summaryRow: WorkOrderSummaryRow): XLSX.WorkSheet {
  return createWorksheet(
    WORKSHEET_HEADERS.SUMMARY,
    [summaryRow],
    (row) => [
      row.workOrderId,
      row.title,
      row.description,
      row.equipmentName,
      row.equipmentSerialNumber,
      row.equipmentLocation,
      row.status,
      row.priority,
      row.createdDate,
      row.dueDate,
      row.completedDate,
      row.daysOpen,
      row.totalLaborHours,
      row.totalMaterialCost,
      row.pmStatus,
      row.assignee,
      row.team,
    ]
  );
}

function buildLaborSheet(laborRows: LaborDetailRow[]): XLSX.WorkSheet {
  return createWorksheet(
    WORKSHEET_HEADERS.LABOR,
    laborRows,
    (row) => [
      row.workOrderId,
      row.workOrderTitle,
      row.date,
      row.technician,
      row.hoursWorked,
      row.notes,
      row.hasPhotos ? 'Yes' : 'No',
      row.photoCount,
    ]
  );
}

function buildCostsSheet(costRows: MaterialCostRow[]): XLSX.WorkSheet {
  const worksheet = createWorksheet(
    WORKSHEET_HEADERS.COSTS,
    costRows,
    (row) => [
      row.workOrderId,
      row.workOrderTitle,
      row.equipmentName,
      row.itemDescription,
      row.quantity,
      row.unitPrice,
      row.totalPrice,
      row.fromInventory ? 'Yes' : 'No',
      row.dateAdded,
      row.addedBy,
    ]
  );

  // Add totals row if there are costs
  if (costRows.length > 0) {
    const totalQuantity = costRows.reduce((sum, row) => sum + row.quantity, 0);
    const totalCost = costRows.reduce((sum, row) => sum + row.totalPrice, 0);
    
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [['', '', '', 'TOTAL', totalQuantity, '', totalCost, '', '', '']],
      { origin: -1 }
    );
  }

  return worksheet;
}

function buildPMChecklistSheet(pmRows: PMChecklistRow[]): XLSX.WorkSheet {
  return createWorksheet(
    WORKSHEET_HEADERS.PM_CHECKLISTS,
    pmRows,
    (row) => [
      row.workOrderId,
      row.workOrderTitle,
      row.equipmentName,
      row.pmStatus,
      row.completedDate,
      row.section,
      row.itemTitle,
      row.condition,
      row.conditionText,
      row.required ? 'Yes' : 'No',
      row.itemNotes,
      row.generalNotes,
    ]
  );
}

function buildTimelineSheet(timelineRows: TimelineRow[]): XLSX.WorkSheet {
  return createWorksheet(
    WORKSHEET_HEADERS.TIMELINE,
    timelineRows,
    (row) => [
      row.workOrderId,
      row.workOrderTitle,
      row.previousStatus,
      row.newStatus,
      row.changedAt,
      row.changedBy,
      row.reason,
    ]
  );
}

function buildEquipmentSheet(equipmentRow: EquipmentRow | null): XLSX.WorkSheet {
  const rows = equipmentRow ? [equipmentRow] : [];
  return createWorksheet(
    WORKSHEET_HEADERS.EQUIPMENT,
    rows,
    (row) => [
      row.equipmentId,
      row.name,
      row.manufacturer,
      row.model,
      row.serialNumber,
      row.location,
      row.status,
      row.workOrderCount,
      row.totalLaborHours,
      row.totalMaterialsCost,
    ]
  );
}

// ============================================
// Main Export Function
// ============================================

/**
 * Generate and download an Excel workbook for a single work order
 * 
 * @param workOrderId - The work order ID to export
 * @param organizationId - The organization ID for security validation
 */
export async function generateSingleWorkOrderExcel(
  workOrderId: string,
  organizationId: string
): Promise<void> {
  logger.info('Generating Excel export for work order', { workOrderId });

  // Fetch all data
  const data = await fetchWorkOrderData(workOrderId, organizationId);
  
  if (!data) {
    throw new Error('Failed to fetch work order data');
  }

  // Build worksheet data
  const summaryRow = buildSummaryRow(data);
  const laborRows = buildLaborRows(data);
  const costRows = buildCostRows(data);
  const pmRows = buildPMChecklistRows(data);
  const timelineRows = buildTimelineRows(data);
  const equipmentRow = buildEquipmentRow(data);

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add worksheets
  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(summaryRow), WORKSHEET_NAMES.SUMMARY);
  XLSX.utils.book_append_sheet(workbook, buildLaborSheet(laborRows), WORKSHEET_NAMES.LABOR);
  XLSX.utils.book_append_sheet(workbook, buildCostsSheet(costRows), WORKSHEET_NAMES.COSTS);
  
  if (pmRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, buildPMChecklistSheet(pmRows), WORKSHEET_NAMES.PM_CHECKLISTS);
  }
  
  XLSX.utils.book_append_sheet(workbook, buildTimelineSheet(timelineRows), WORKSHEET_NAMES.TIMELINE);
  XLSX.utils.book_append_sheet(workbook, buildEquipmentSheet(equipmentRow), WORKSHEET_NAMES.EQUIPMENT);

  // Generate filename
  const safeTitle = data.workOrder.title
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `WorkOrder-${safeTitle}-${dateStr}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
  
  logger.info('Excel export completed', { filename });
}

/**
 * Generate Excel workbook data (for bulk export via edge function)
 * Returns the workbook as a Uint8Array
 */
export function generateWorkbookBuffer(
  summaryRows: WorkOrderSummaryRow[],
  laborRows: LaborDetailRow[],
  costRows: MaterialCostRow[],
  pmRows: PMChecklistRow[],
  timelineRows: TimelineRow[],
  equipmentRows: EquipmentRow[]
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summarySheet = createWorksheet(
    WORKSHEET_HEADERS.SUMMARY,
    summaryRows,
    (row) => [
      row.workOrderId,
      row.title,
      row.description,
      row.equipmentName,
      row.equipmentSerialNumber,
      row.equipmentLocation,
      row.status,
      row.priority,
      row.createdDate,
      row.dueDate,
      row.completedDate,
      row.daysOpen,
      row.totalLaborHours,
      row.totalMaterialCost,
      row.pmStatus,
      row.assignee,
      row.team,
    ]
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, WORKSHEET_NAMES.SUMMARY);

  // Labor sheet
  XLSX.utils.book_append_sheet(workbook, buildLaborSheet(laborRows), WORKSHEET_NAMES.LABOR);

  // Costs sheet with totals
  const costsSheet = buildCostsSheet(costRows);
  XLSX.utils.book_append_sheet(workbook, costsSheet, WORKSHEET_NAMES.COSTS);

  // PM Checklists sheet
  if (pmRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, buildPMChecklistSheet(pmRows), WORKSHEET_NAMES.PM_CHECKLISTS);
  }

  // Timeline sheet
  XLSX.utils.book_append_sheet(workbook, buildTimelineSheet(timelineRows), WORKSHEET_NAMES.TIMELINE);

  // Equipment sheet
  const equipmentSheet = createWorksheet(
    WORKSHEET_HEADERS.EQUIPMENT,
    equipmentRows,
    (row) => [
      row.equipmentId,
      row.name,
      row.manufacturer,
      row.model,
      row.serialNumber,
      row.location,
      row.status,
      row.workOrderCount,
      row.totalLaborHours,
      row.totalMaterialsCost,
    ]
  );
  XLSX.utils.book_append_sheet(workbook, equipmentSheet, WORKSHEET_NAMES.EQUIPMENT);

  // Generate buffer
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}
