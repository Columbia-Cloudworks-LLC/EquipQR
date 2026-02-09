/**
 * Work Order Excel Export Service
 * 
 * Client-side service for generating Excel exports of work order cost items.
 * Uses SheetJS (xlsx) library.
 */

// XLSX is loaded dynamically to reduce initial bundle size (~200KB)
// It's only needed when a user explicitly triggers an Excel export
type XLSXModule = typeof import('xlsx');
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';

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


// ============================================
// Main Export Function
// ============================================

/**
 * Generate and download an Excel workbook containing cost items for a single work order.
 * 
 * The export includes a single "Cost Items" worksheet with work order, equipment, and team
 * context columns along with detailed cost item information.
 * 
 * @param workOrderId - The work order ID to export cost items for
 * @param organizationId - The organization ID for security validation
 */
export async function generateSingleWorkOrderExcel(
  workOrderId: string,
  organizationId: string
): Promise<void> {
  logger.info('Generating Excel export for work order cost items', { workOrderId, organizationId });

  try {
    // Fetch work order with equipment and team info
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
        equipment:equipment_id (
          id,
          name,
          manufacturer,
          model,
          serial_number,
          location,
          teams:team_id (
            name
          )
        )
      `)
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (woError || !workOrder) {
      logger.error('Failed to fetch work order:', woError);
      throw new Error('Failed to fetch work order data');
    }

    // Extract equipment and team info
    const equipment = workOrder.equipment as {
      id: string;
      name: string;
      manufacturer: string | null;
      model: string | null;
      serial_number: string | null;
      location: string | null;
      teams: { name: string } | null;
    } | null;
    const teamName = equipment?.teams?.name || 'Unassigned';

    // Fetch costs with organization_id constraint via work_orders join
    const { data: costs, error: costsError } = await supabase
      .from('work_order_costs')
      .select('*, work_orders!inner(organization_id)')
      .eq('work_order_id', workOrderId)
      .eq('work_orders.organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (costsError) {
      logger.error('Failed to fetch work order costs:', costsError);
      throw new Error('Failed to fetch work order costs');
    }

    // Get creator names for costs
    const costCreatorIds = [...new Set((costs || []).map(c => c.created_by))];
    let costsWithCreators: WorkOrderCost[] = [];
    
    if (costCreatorIds.length > 0) {
      const { data: costProfiles, error: costProfilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', costCreatorIds);

      if (costProfilesError) {
        logger.error('Failed to fetch cost creator profiles:', costProfilesError);
        throw new Error('Failed to fetch cost creator profiles');
      }
      
      const costProfileMap = new Map(costProfiles?.map(p => [p.id, p.name]) || []);
      
      costsWithCreators = (costs || []).map(cost => ({
        ...cost,
        created_by_name: costProfileMap.get(cost.created_by) || 'Unknown',
      }));
    }

    logger.info('Cost data fetched', { 
      costCount: costsWithCreators.length
    });

    // Helper to format status for display
    const formatStatus = (status: string) => status.replace(/_/g, ' ').toUpperCase();

    // Build cost rows with work order, equipment, and team context
    const costRows = costsWithCreators.map(cost => {
      // Defensive checks for cost fields
      const unitPriceCents = cost.unit_price_cents ?? 0;
      const quantity = cost.quantity ?? 0;
      const totalPriceCents = cost.total_price_cents ?? (quantity * unitPriceCents);
      
      return {
        // Work Order context
        workOrderId: workOrder.id,
        workOrderTitle: workOrder.title,
        workOrderStatus: formatStatus(workOrder.status),
        workOrderPriority: workOrder.priority.toUpperCase(),
        workOrderCreatedDate: formatDate(workOrder.created_date),
        workOrderDueDate: formatDate(workOrder.due_date),
        workOrderCompletedDate: formatDate(workOrder.completed_date),
        workOrderAssignee: workOrder.assignee_name || 'Unassigned',
        // Team context
        teamName,
        // Equipment context
        equipmentName: equipment?.name || '',
        equipmentSerialNumber: equipment?.serial_number || '',
        equipmentManufacturer: equipment?.manufacturer || '',
        equipmentModel: equipment?.model || '',
        equipmentLocation: equipment?.location || '',
        // Cost item details
        itemDescription: cost.description || '',
        quantity,
        unitPrice: unitPriceCents / 100,
        totalPrice: totalPriceCents / 100,
        fromInventory: !!cost.inventory_item_id,
        dateAdded: formatDateTime(cost.created_at),
        addedBy: cost.created_by_name || 'Unknown',
      };
    });

    // Dynamically load XLSX only when export is triggered
    const XLSX: XLSXModule = await import('xlsx');

    // Create workbook with the costs sheet
    const workbook = XLSX.utils.book_new();

    // Create costs worksheet with context columns
    const costHeaders = [
      // Work Order context
      'Work Order ID',
      'Work Order Title',
      'WO Status',
      'WO Priority',
      'WO Created Date',
      'WO Due Date',
      'WO Completed Date',
      'WO Assignee',
      // Team context
      'Team',
      // Equipment context
      'Equipment Name',
      'Serial Number',
      'Manufacturer',
      'Model',
      'Location',
      // Cost item details
      'Item Description',
      'Quantity',
      'Unit Price',
      'Total Price',
      'From Inventory',
      'Date Added',
      'Added By',
    ];

    const costData: (string | number | boolean)[][] = [
      costHeaders,
      ...costRows.map(row => [
        row.workOrderId,
        row.workOrderTitle,
        row.workOrderStatus,
        row.workOrderPriority,
        row.workOrderCreatedDate,
        row.workOrderDueDate,
        row.workOrderCompletedDate,
        row.workOrderAssignee,
        row.teamName,
        row.equipmentName,
        row.equipmentSerialNumber,
        row.equipmentManufacturer,
        row.equipmentModel,
        row.equipmentLocation,
        row.itemDescription,
        row.quantity,
        row.unitPrice,
        row.totalPrice,
        row.fromInventory ? 'Yes' : 'No',
        row.dateAdded,
        row.addedBy,
      ]),
    ];

    // Add totals row if there are costs (aligned to the cost columns)
    if (costRows.length > 0) {
      const totalQuantity = costRows.reduce((sum, row) => sum + row.quantity, 0);
      const totalCost = costRows.reduce((sum, row) => sum + row.totalPrice, 0);
      // Empty cells for context columns, then totals in cost columns
      costData.push([
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'TOTAL', totalQuantity, '', totalCost, '', '', ''
      ]);
    }

    const costsSheet = XLSX.utils.aoa_to_sheet(costData);

    // Calculate column widths
    const colWidths = costHeaders.map((header, colIndex) => {
      let maxWidth = header.length;
      costRows.forEach((_, rowIndex) => {
        const cellValue = costData[rowIndex + 1][colIndex];
        const cellLength = String(cellValue ?? '').length;
        if (cellLength > maxWidth) {
          maxWidth = cellLength;
        }
      });
      // Check totals row if it exists
      if (costRows.length > 0 && costData[costData.length - 1]) {
        const totalsCellValue = costData[costData.length - 1][colIndex];
        const totalsCellLength = String(totalsCellValue ?? '').length;
        if (totalsCellLength > maxWidth) {
          maxWidth = totalsCellLength;
        }
      }
      return { wch: Math.min(maxWidth + 2, 50) };
    });
    costsSheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, costsSheet, 'Cost Items');

    // Generate filename
    const safeTitle = workOrder.title
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `WorkOrder-${safeTitle}-Costs-${dateStr}.xlsx`;

    logger.info('Writing Excel file', { filename });

    // Download file
    XLSX.writeFile(workbook, filename);
    
    logger.info('Excel export completed', { filename, costCount: costRows.length });
  } catch (error) {
    logger.error('Error generating Excel export', { error, workOrderId, organizationId });
    throw error;
  }
}

