/**
 * Export Report Edge Function
 *
 * Exports data (equipment, work orders, inventory, etc.) to CSV format.
 * Requires authenticated user with admin/owner role in the organization.
 * Uses user-scoped client so RLS policies apply.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Maximum rows per export to prevent abuse
const MAX_ROWS = 50000;

type ReportType = 'equipment' | 'work-orders' | 'inventory' | 'scans' | 'alternate-groups';

interface ExportFilters {
  status?: string;
  teamId?: string;
  location?: string;
  priority?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface ExportRequest {
  reportType: ReportType;
  organizationId: string;
  filters: ExportFilters;
  columns: string[];
  format: 'csv';
}

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
    const { reportType, organizationId, filters, columns, format } = body;

    // Validate required fields
    if (!reportType || !organizationId || !columns || columns.length === 0) {
      return createErrorResponse(
        'Missing required fields: reportType, organizationId, and columns are required',
        400
      );
    }

    // Validate format
    if (format !== 'csv') {
      return createErrorResponse('Unsupported format. Only CSV is currently supported.', 400);
    }

    // Verify user has admin/owner role in the organization (RLS also applies)
    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse('Forbidden: Only owners and admins can export reports', 403);
    }

    // Check rate limit
    const rateLimitOk = await checkRateLimit(user.id, organizationId);
    if (!rateLimitOk) {
      return createErrorResponse(
        'Rate limit exceeded. Please wait before requesting another export.',
        429
      );
    }

    // Log the export request (RLS will apply)
    const { data: exportLog } = await supabase
      .from('export_request_log')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        report_type: reportType,
        row_count: 0,
        status: 'pending'
      })
      .select('id')
      .single();

    const exportLogId = exportLog?.id;

    // Execute the export based on report type
    let csvContent: string;
    let rowCount: number;

    try {
      switch (reportType) {
        case 'equipment':
          ({ csvContent, rowCount } = await exportEquipment(organizationId, filters, columns));
          break;
        case 'work-orders':
          ({ csvContent, rowCount } = await exportWorkOrders(organizationId, filters, columns));
          break;
        case 'inventory':
          ({ csvContent, rowCount } = await exportInventory(organizationId, filters, columns));
          break;
        case 'scans':
          ({ csvContent, rowCount } = await exportScans(organizationId, filters, columns));
          break;
        case 'alternate-groups':
          ({ csvContent, rowCount } = await exportAlternateGroups(organizationId, filters, columns));
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Update export log with success
      if (exportLogId) {
        await supabase
          .from('export_request_log')
          .update({ 
            status: 'completed', 
            row_count: rowCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', exportLogId);
      }

      // Return CSV as downloadable response
      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${reportType}_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });

    } catch (exportError) {
      // Update export log with failure
      if (exportLogId) {
        await supabase
          .from('export_request_log')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', exportLogId);
      }
      throw exportError;
    }

  } catch (error) {
    // Log the full error server-side for debugging
    console.error('[EXPORT-REPORT] Export error:', error);
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

/**
 * Check rate limits for export requests
 * - Max 5 exports per user per minute
 * - Max 50 exports per organization per hour
 */
async function checkRateLimit(userId: string, organizationId: string): Promise<boolean> {
  // Check if export_request_log table exists - if not, allow the request
  // This handles the case before the migration is run
  const { error: tableCheckError } = await supabase
    .from('export_request_log')
    .select('id')
    .limit(1);

  if (tableCheckError) {
    // Table doesn't exist yet, allow the request
    console.log('export_request_log table not found, skipping rate limit check');
    return true;
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check user's exports in the last minute
  const { count: userCount } = await supabase
    .from('export_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('requested_at', oneMinuteAgo);

  if ((userCount ?? 0) >= 5) {
    return false;
  }

  // Check organization's exports in the last hour
  const { count: orgCount } = await supabase
    .from('export_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('requested_at', oneHourAgo);

  if ((orgCount ?? 0) >= 50) {
    return false;
  }

  return true;
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Format a date string to YYYY-MM-DD
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return dateString;
  }
}

/**
 * Export equipment data
 */
async function exportEquipment(
  organizationId: string, 
  filters: ExportFilters, 
  columns: string[]
): Promise<{ csvContent: string; rowCount: number }> {
  // Build query
  let query = supabase
    .from('equipment')
    .select(`
      id,
      name,
      manufacturer,
      model,
      serial_number,
      status,
      location,
      installation_date,
      last_maintenance,
      working_hours,
      warranty_expiration,
      notes,
      custom_attributes,
      created_at,
      team_id,
      teams:team_id (name)
    `)
    .eq('organization_id', organizationId)
    .order('name')
    .limit(MAX_ROWS);

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  const { data: equipment, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch equipment: ${error.message}`);
  }

  if (!equipment || equipment.length === 0) {
    return { csvContent: 'No data found', rowCount: 0 };
  }

  // Column mapping for equipment
  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    'name': (item) => escapeCSVValue(item.name),
    'manufacturer': (item) => escapeCSVValue(item.manufacturer),
    'model': (item) => escapeCSVValue(item.model),
    'serial_number': (item) => escapeCSVValue(item.serial_number),
    'status': (item) => escapeCSVValue(item.status),
    'location': (item) => escapeCSVValue(item.location),
    'team_name': (item) => escapeCSVValue((item.teams as Record<string, unknown>)?.name ?? ''),
    'installation_date': (item) => formatDate(item.installation_date as string),
    'last_maintenance': (item) => formatDate(item.last_maintenance as string),
    'working_hours': (item) => escapeCSVValue(item.working_hours ?? '0'),
    'warranty_expiration': (item) => formatDate(item.warranty_expiration as string),
    'notes': (item) => escapeCSVValue(item.notes),
    'created_at': (item) => formatDate(item.created_at as string),
    'url': (item) => escapeCSVValue(`${Deno.env.get('PUBLIC_SITE_URL') || 'https://app.equipqr.com'}/dashboard/equipment/${item.id}`),
  };

  // Column labels
  const columnLabels: Record<string, string> = {
    'name': 'Name',
    'manufacturer': 'Manufacturer',
    'model': 'Model',
    'serial_number': 'Serial Number',
    'status': 'Status',
    'location': 'Location',
    'team_name': 'Team',
    'installation_date': 'Installation Date',
    'last_maintenance': 'Last Maintenance',
    'working_hours': 'Working Hours',
    'warranty_expiration': 'Warranty Expiration',
    'notes': 'Notes',
    'created_at': 'Created Date',
    'url': 'URL',
  };

  // Filter to only requested columns that exist
  const validColumns = columns.filter(col => col in columnMap || col === 'custom_attributes');

  // Build header row
  const headers: string[] = [];
  for (const col of validColumns) {
    if (col === 'custom_attributes') {
      // Expand custom attributes to individual columns
      const allCustomKeys = new Set<string>();
      for (const item of equipment) {
        if (item.custom_attributes && typeof item.custom_attributes === 'object') {
          Object.keys(item.custom_attributes as Record<string, unknown>).forEach(k => allCustomKeys.add(k));
        }
      }
      allCustomKeys.forEach(k => headers.push(escapeCSVValue(k)));
    } else {
      headers.push(columnLabels[col] || col);
    }
  }

  // Build data rows
  const rows: string[] = [headers.join(',')];
  
  for (const item of equipment) {
    const rowValues: string[] = [];
    
    for (const col of validColumns) {
      if (col === 'custom_attributes') {
        // Expand custom attributes
        const allCustomKeys = new Set<string>();
        for (const eq of equipment) {
          if (eq.custom_attributes && typeof eq.custom_attributes === 'object') {
            Object.keys(eq.custom_attributes as Record<string, unknown>).forEach(k => allCustomKeys.add(k));
          }
        }
        allCustomKeys.forEach(k => {
          const customAttrs = item.custom_attributes as Record<string, unknown> | null;
          rowValues.push(escapeCSVValue(customAttrs?.[k] ?? ''));
        });
      } else if (columnMap[col]) {
        rowValues.push(columnMap[col](item as Record<string, unknown>));
      }
    }
    
    rows.push(rowValues.join(','));
  }

  return { 
    csvContent: rows.join('\n'), 
    rowCount: equipment.length 
  };
}

/**
 * Export work orders data
 */
async function exportWorkOrders(
  organizationId: string, 
  filters: ExportFilters, 
  columns: string[]
): Promise<{ csvContent: string; rowCount: number }> {
  // Build query
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
      estimated_hours,
      assignee_name,
      team_id,
      equipment_id,
      has_pm,
      teams:team_id (name),
      equipment:equipment_id (name)
    `)
    .eq('organization_id', organizationId)
    .order('created_date', { ascending: false })
    .limit(MAX_ROWS);

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
  if (filters.dateRange?.from) {
    query = query.gte('created_date', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte('created_date', filters.dateRange.to);
  }

  const { data: workOrders, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch work orders: ${error.message}`);
  }

  if (!workOrders || workOrders.length === 0) {
    return { csvContent: 'No data found', rowCount: 0 };
  }

  // Column mapping for work orders
  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    'title': (item) => escapeCSVValue(item.title),
    'description': (item) => escapeCSVValue(item.description),
    'status': (item) => escapeCSVValue(item.status),
    'priority': (item) => escapeCSVValue(item.priority),
    'assignee_name': (item) => escapeCSVValue(item.assignee_name),
    'team_name': (item) => escapeCSVValue((item.teams as Record<string, unknown>)?.name ?? ''),
    'equipment_name': (item) => escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ''),
    'created_date': (item) => formatDate(item.created_date as string),
    'due_date': (item) => formatDate(item.due_date as string),
    'completed_date': (item) => formatDate(item.completed_date as string),
    'estimated_hours': (item) => escapeCSVValue(item.estimated_hours ?? ''),
    'has_pm': (item) => item.has_pm ? 'Yes' : 'No',
  };

  const columnLabels: Record<string, string> = {
    'title': 'Title',
    'description': 'Description',
    'status': 'Status',
    'priority': 'Priority',
    'assignee_name': 'Assignee',
    'team_name': 'Team',
    'equipment_name': 'Equipment',
    'created_date': 'Created Date',
    'due_date': 'Due Date',
    'completed_date': 'Completed Date',
    'estimated_hours': 'Estimated Hours',
    'has_pm': 'Has PM Checklist',
  };

  const validColumns = columns.filter(col => col in columnMap);
  const headers = validColumns.map(col => columnLabels[col] || col);
  const rows: string[] = [headers.join(',')];

  for (const item of workOrders) {
    const rowValues = validColumns.map(col => columnMap[col](item as Record<string, unknown>));
    rows.push(rowValues.join(','));
  }

  return { 
    csvContent: rows.join('\n'), 
    rowCount: workOrders.length 
  };
}

/**
 * Export inventory data
 */
async function exportInventory(
  organizationId: string, 
  filters: ExportFilters, 
  columns: string[]
): Promise<{ csvContent: string; rowCount: number }> {
  // Build query
  let query = supabase
    .from('inventory_items')
    .select(`
      id,
      name,
      description,
      sku,
      external_id,
      quantity_on_hand,
      low_stock_threshold,
      default_unit_cost,
      location,
      image_url,
      created_at
    `)
    .eq('organization_id', organizationId)
    .order('name')
    .limit(MAX_ROWS);

  // Apply filters
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  const { data: inventory, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }

  if (!inventory || inventory.length === 0) {
    return { csvContent: 'No data found', rowCount: 0 };
  }

  // Column mapping for inventory
  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    'name': (item) => escapeCSVValue(item.name),
    'description': (item) => escapeCSVValue(item.description),
    'sku': (item) => escapeCSVValue(item.sku),
    'external_id': (item) => escapeCSVValue(item.external_id),
    'quantity_on_hand': (item) => escapeCSVValue(item.quantity_on_hand),
    'low_stock_threshold': (item) => escapeCSVValue(item.low_stock_threshold),
    'default_unit_cost': (item) => {
      const cost = item.default_unit_cost as number | null;
      return cost !== null ? `$${(cost / 100).toFixed(2)}` : '';
    },
    'location': (item) => escapeCSVValue(item.location),
    'is_low_stock': (item) => {
      const qty = item.quantity_on_hand as number;
      const threshold = item.low_stock_threshold as number;
      return qty <= threshold ? 'Yes' : 'No';
    },
    'created_at': (item) => formatDate(item.created_at as string),
  };

  const columnLabels: Record<string, string> = {
    'name': 'Name',
    'description': 'Description',
    'sku': 'SKU',
    'external_id': 'External ID',
    'quantity_on_hand': 'Quantity',
    'low_stock_threshold': 'Low Stock Threshold',
    'default_unit_cost': 'Unit Cost',
    'location': 'Location',
    'is_low_stock': 'Low Stock',
    'created_at': 'Created Date',
  };

  const validColumns = columns.filter(col => col in columnMap);
  const headers = validColumns.map(col => columnLabels[col] || col);
  const rows: string[] = [headers.join(',')];

  for (const item of inventory) {
    const rowValues = validColumns.map(col => columnMap[col](item as Record<string, unknown>));
    rows.push(rowValues.join(','));
  }

  return { 
    csvContent: rows.join('\n'), 
    rowCount: inventory.length 
  };
}

/**
 * Export scans data
 */
async function exportScans(
  organizationId: string, 
  filters: ExportFilters, 
  columns: string[]
): Promise<{ csvContent: string; rowCount: number }> {
  // Build query - scans are linked to equipment which has organization_id
  let query = supabase
    .from('scans')
    .select(`
      id,
      scanned_at,
      location,
      notes,
      scanned_by,
      equipment:equipment_id (
        id,
        name,
        organization_id
      ),
      profiles:scanned_by (
        full_name
      )
    `)
    .order('scanned_at', { ascending: false })
    .limit(MAX_ROWS);

  const { data: scans, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch scans: ${error.message}`);
  }

  // Filter to only scans for this organization's equipment
  const orgScans = (scans || []).filter(scan => {
    const equipment = scan.equipment as Record<string, unknown> | null;
    return equipment?.organization_id === organizationId;
  });

  if (orgScans.length === 0) {
    return { csvContent: 'No data found', rowCount: 0 };
  }

  // Apply date filters
  let filteredScans = orgScans;
  if (filters.dateRange?.from) {
    const fromDate = new Date(filters.dateRange.from);
    filteredScans = filteredScans.filter(scan => new Date(scan.scanned_at) >= fromDate);
  }
  if (filters.dateRange?.to) {
    const toDate = new Date(filters.dateRange.to);
    filteredScans = filteredScans.filter(scan => new Date(scan.scanned_at) <= toDate);
  }

  // Column mapping for scans
  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    'equipment_name': (item) => escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ''),
    'scanned_by_name': (item) => escapeCSVValue((item.profiles as Record<string, unknown>)?.full_name ?? ''),
    'scanned_at': (item) => {
      const date = item.scanned_at as string;
      if (!date) return '';
      try {
        return new Date(date).toISOString().replace('T', ' ').split('.')[0];
      } catch {
        return date;
      }
    },
    'location': (item) => escapeCSVValue(item.location),
    'notes': (item) => escapeCSVValue(item.notes),
  };

  const columnLabels: Record<string, string> = {
    'equipment_name': 'Equipment',
    'scanned_by_name': 'Scanned By',
    'scanned_at': 'Scanned At',
    'location': 'Location',
    'notes': 'Notes',
  };

  const validColumns = columns.filter(col => col in columnMap);
  const headers = validColumns.map(col => columnLabels[col] || col);
  const rows: string[] = [headers.join(',')];

  for (const item of filteredScans) {
    const rowValues = validColumns.map(col => columnMap[col](item as Record<string, unknown>));
    rows.push(rowValues.join(','));
  }

  return { 
    csvContent: rows.join('\n'), 
    rowCount: filteredScans.length 
  };
}

/**
 * Export alternate part groups data
 * Each row represents one group member (inventory item or part identifier)
 */
async function exportAlternateGroups(
  organizationId: string, 
  _filters: ExportFilters, 
  columns: string[]
): Promise<{ csvContent: string; rowCount: number }> {
  // First, get all groups for this organization
  const { data: groups, error: groupsError } = await supabase
    .from('part_alternate_groups')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')
    .limit(MAX_ROWS);

  if (groupsError) {
    throw new Error(`Failed to fetch alternate groups: ${groupsError.message}`);
  }

  if (!groups || groups.length === 0) {
    return { csvContent: 'No data found', rowCount: 0 };
  }

  const groupIds = groups.map(g => g.id);

  // Get all members for these groups with joined data
  const { data: members, error: membersError } = await supabase
    .from('part_alternate_group_members')
    .select(`
      id,
      group_id,
      part_identifier_id,
      inventory_item_id,
      is_primary,
      notes,
      part_identifiers (
        identifier_type,
        raw_value,
        manufacturer
      ),
      inventory_items (
        name,
        sku,
        quantity_on_hand,
        low_stock_threshold,
        default_unit_cost,
        location
      )
    `)
    .in('group_id', groupIds)
    .order('is_primary', { ascending: false })
    .limit(MAX_ROWS);

  if (membersError) {
    throw new Error(`Failed to fetch group members: ${membersError.message}`);
  }

  if (!members || members.length === 0) {
    return { csvContent: 'No data found', rowCount: 0 };
  }

  // Create a lookup map for groups
  const groupMap = new Map(groups.map(g => [g.id, g]));

  // Flatten members with group data
  interface FlattenedMember {
    group_name: string;
    group_status: string;
    group_description: string | null;
    group_notes: string | null;
    member_type: string;
    is_primary: boolean;
    item_name: string | null;
    item_sku: string | null;
    quantity_on_hand: number;
    low_stock_threshold: number;
    default_unit_cost: number | null;
    location: string | null;
    identifier_type: string | null;
    identifier_value: string | null;
    identifier_manufacturer: string | null;
  }

  const flattenedMembers: FlattenedMember[] = members.map(member => {
    const group = groupMap.get(member.group_id);
    const invItem = member.inventory_items as Record<string, unknown> | null;
    const partIdent = member.part_identifiers as Record<string, unknown> | null;

    // Determine member type
    const memberType = member.inventory_item_id ? 'Inventory Item' : 'Part Identifier';

    return {
      group_name: group?.name ?? '',
      group_status: group?.status ?? '',
      group_description: group?.description ?? null,
      group_notes: group?.notes ?? null,
      member_type: memberType,
      is_primary: member.is_primary,
      item_name: (invItem?.name as string) ?? null,
      item_sku: (invItem?.sku as string) ?? null,
      quantity_on_hand: (invItem?.quantity_on_hand as number) ?? 0,
      low_stock_threshold: (invItem?.low_stock_threshold as number) ?? 0,
      default_unit_cost: (invItem?.default_unit_cost as number) ?? null,
      location: (invItem?.location as string) ?? null,
      identifier_type: (partIdent?.identifier_type as string) ?? null,
      identifier_value: (partIdent?.raw_value as string) ?? null,
      identifier_manufacturer: (partIdent?.manufacturer as string) ?? null,
    };
  });

  // Column mapping for alternate groups
  const columnMap: Record<string, (item: FlattenedMember) => string> = {
    'group_name': (item) => escapeCSVValue(item.group_name),
    'group_status': (item) => escapeCSVValue(item.group_status),
    'group_description': (item) => escapeCSVValue(item.group_description),
    'member_type': (item) => escapeCSVValue(item.member_type),
    'is_primary': (item) => item.is_primary ? 'Yes' : 'No',
    'item_name': (item) => escapeCSVValue(item.item_name),
    'item_sku': (item) => escapeCSVValue(item.item_sku),
    'quantity_on_hand': (item) => escapeCSVValue(item.quantity_on_hand),
    'is_low_stock': (item) => {
      if (item.item_name === null) return ''; // Not an inventory item
      return item.quantity_on_hand <= item.low_stock_threshold ? 'Yes' : 'No';
    },
    'default_unit_cost': (item) => {
      if (item.default_unit_cost === null) return '';
      return `$${(item.default_unit_cost / 100).toFixed(2)}`;
    },
    'location': (item) => escapeCSVValue(item.location),
    'identifier_type': (item) => escapeCSVValue(item.identifier_type),
    'identifier_value': (item) => escapeCSVValue(item.identifier_value),
    'identifier_manufacturer': (item) => escapeCSVValue(item.identifier_manufacturer),
    'group_notes': (item) => escapeCSVValue(item.group_notes),
  };

  const columnLabels: Record<string, string> = {
    'group_name': 'Group Name',
    'group_status': 'Verification Status',
    'group_description': 'Description',
    'member_type': 'Member Type',
    'is_primary': 'Primary Part',
    'item_name': 'Item Name',
    'item_sku': 'SKU',
    'quantity_on_hand': 'Quantity',
    'is_low_stock': 'Low Stock',
    'default_unit_cost': 'Unit Cost',
    'location': 'Location',
    'identifier_type': 'Identifier Type',
    'identifier_value': 'Part Number',
    'identifier_manufacturer': 'Part Manufacturer',
    'group_notes': 'Notes',
  };

  const validColumns = columns.filter(col => col in columnMap);
  const headers = validColumns.map(col => columnLabels[col] || col);
  const rows: string[] = [headers.join(',')];

  for (const item of flattenedMembers) {
    const rowValues = validColumns.map(col => columnMap[col](item));
    rows.push(rowValues.join(','));
  }

  return { 
    csvContent: rows.join('\n'), 
    rowCount: flattenedMembers.length 
  };
}
