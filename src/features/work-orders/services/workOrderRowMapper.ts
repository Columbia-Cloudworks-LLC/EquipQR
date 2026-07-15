import { parseLastKnownLocation, resolveEffectiveLocation } from '@/utils/effectiveLocation';
import {
  WorkOrder,
  WorkOrderEmbeddedEquipment,
} from '@/features/work-orders/types/workOrder';

// Optimized select query string with all joins.
//
// `status`, `default_pm_template_id`, and `customer_id` are intentionally
// included in the embedded equipment block so the work-order detail page can
// stop issuing a second `useEquipmentById` round-trip just to read those
// three fields. The added columns are tiny (uuid + enum), so the per-row
// payload cost on the work-order list query stays negligible while every WO
// detail open on Slow 4G saves a full equipment row fetch.
export const WORK_ORDER_SELECT = `
  *,
  assignee:profiles!work_orders_assignee_id_fkey (
    id,
    name,
    avatar_url
  ),
  equipment:equipment!work_orders_equipment_id_fkey (
    id,
    organization_id,
    name,
    manufacturer,
    model,
    serial_number,
    status,
    working_hours,
    image_url,
    team_id,
    location,
    customer_id,
    default_pm_template_id,
    custom_attributes,
    use_team_location,
    last_known_location,
    assigned_location_lat,
    assigned_location_lng,
    assigned_location_street,
    assigned_location_city,
    assigned_location_state,
    assigned_location_country,
    teams:team_id (
      id,
      name,
      description,
      override_equipment_location,
      location_lat,
      location_lng,
      location_address,
      location_city,
      location_state,
      location_country
    )
  ),
  creator:profiles!work_orders_created_by_fkey (
    id,
    name,
    avatar_url
  )
`;

export const WORK_ORDER_LIST_SELECT = WORK_ORDER_SELECT.replace(/^ *custom_attributes,\r?\n/m, '');

export type WorkOrderJoinedProfile = { id?: string; name?: string; avatar_url?: string | null } | null;
export type WorkOrderJoinedTeam = {
  id?: string;
  name?: string;
  description?: string;
  override_equipment_location?: boolean;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
} | null;
export type WorkOrderJoinedEquipment = {
  id?: string;
  organization_id?: string;
  name?: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status?: string;
  working_hours?: number | null;
  image_url?: string | null;
  team_id?: string;
  location?: string;
  customer_id?: string | null;
  default_pm_template_id?: string | null;
  custom_attributes?: Record<string, unknown> | null;
  use_team_location?: boolean;
  last_known_location?: { latitude?: number; longitude?: number; name?: string } | null;
  assigned_location_lat?: number | null;
  assigned_location_lng?: number | null;
  assigned_location_street?: string | null;
  assigned_location_city?: string | null;
  assigned_location_state?: string | null;
  assigned_location_country?: string | null;
  teams?: WorkOrderJoinedTeam;
} | null;

export function mapBaseWorkOrderFields(wo: Record<string, unknown>): Partial<WorkOrder> {
  return {
    id: wo.id as string,
    title: wo.title as string,
    description: wo.description as string,
    equipment_id: wo.equipment_id as string,
    organization_id: wo.organization_id as string,
    priority: wo.priority as WorkOrder['priority'],
    status: wo.status as WorkOrder['status'],
    assignee_id: wo.assignee_id as string | null,
    assignee_name: wo.assignee_name as string | null,
    team_id: wo.team_id as string | null,
    created_by: wo.created_by as string,
    created_by_admin: wo.created_by_admin as string | null,
    created_by_name: wo.created_by_name as string | null,
    created_date: wo.created_date as string,
    due_date: wo.due_date as string | null,
    estimated_hours: wo.estimated_hours as number | null,
    completed_date: wo.completed_date as string | null,
    acceptance_date: wo.acceptance_date as string | null,
    updated_at: wo.updated_at as string,
    is_historical: wo.is_historical as boolean,
    historical_start_date: wo.historical_start_date as string | null,
    historical_notes: wo.historical_notes as string | null,
    has_pm: wo.has_pm as boolean,
    pm_required: wo.pm_required as boolean,
    primary_image_id: (wo.primary_image_id as string | null | undefined) ?? null,
  };
}

export function mapQuickBooksInvoiceFields(wo: Record<string, unknown>): Partial<WorkOrder> {
  const invoiceEnvironment = wo.quickbooks_invoice_environment as 'sandbox' | 'production' | null | undefined;
  const invoiceStatus = wo.invoice_status as WorkOrder['invoice_status'] | undefined;

  return {
    quickbooks_invoice_id: (wo.quickbooks_invoice_id as string | null | undefined) ?? null,
    quickbooks_invoice_number: (wo.quickbooks_invoice_number as string | null | undefined) ?? null,
    quickbooks_invoice_environment: invoiceEnvironment ?? null,
    quickbooks_realm_id: (wo.quickbooks_realm_id as string | null | undefined) ?? null,
    invoice_status: invoiceStatus ?? null,
    invoice_sent_at: (wo.invoice_sent_at as string | null | undefined) ?? null,
    invoice_paid_at: (wo.invoice_paid_at as string | null | undefined) ?? null,
    invoice_balance_cents: (wo.invoice_balance_cents as number | null | undefined) ?? null,
    invoice_due_date: (wo.invoice_due_date as string | null | undefined) ?? null,
    invoice_last_synced_at: (wo.invoice_last_synced_at as string | null | undefined) ?? null,
    invoice_sync_error: (wo.invoice_sync_error as string | null | undefined) ?? null,
    quickbooksInvoiceId: (wo.quickbooks_invoice_id as string | null | undefined) ?? null,
    quickbooksInvoiceNumber: (wo.quickbooks_invoice_number as string | null | undefined) ?? null,
    quickbooksInvoiceEnvironment: invoiceEnvironment ?? null,
    invoiceStatus: invoiceStatus ?? null,
    invoiceSentAt: (wo.invoice_sent_at as string | null | undefined) ?? null,
    invoicePaidAt: (wo.invoice_paid_at as string | null | undefined) ?? null,
    invoiceBalanceCents: (wo.invoice_balance_cents as number | null | undefined) ?? null,
    invoiceDueDate: (wo.invoice_due_date as string | null | undefined) ?? null,
    invoiceLastSyncedAt: (wo.invoice_last_synced_at as string | null | undefined) ?? null,
  };
}

function mapLastScanLocation(
  equipment: WorkOrderJoinedEquipment,
): { lat: number; lng: number; updatedAt?: string; formattedAddress?: string } | undefined {
  return parseLastKnownLocation(equipment?.last_known_location ?? null);
}

function mapTeamLocationInput(team: WorkOrderJoinedTeam) {
  if (!team) {
    return undefined;
  }

  return {
    override_equipment_location: team.override_equipment_location,
    location_lat: team.location_lat,
    location_lng: team.location_lng,
    location_address: team.location_address,
    location_city: team.location_city,
    location_state: team.location_state,
    location_country: team.location_country,
  };
}

function mapEquipmentLocationInput(equipment: WorkOrderJoinedEquipment) {
  return {
    use_team_location: equipment?.use_team_location,
    assigned_location_lat: equipment?.assigned_location_lat,
    assigned_location_lng: equipment?.assigned_location_lng,
    assigned_location_street: equipment?.assigned_location_street,
    assigned_location_city: equipment?.assigned_location_city,
    assigned_location_state: equipment?.assigned_location_state,
    assigned_location_country: equipment?.assigned_location_country,
    locationText: equipment?.location,
    updatedAt: equipment?.updated_at,
  };
}

export function resolveWorkOrderLocation(equipment: WorkOrderJoinedEquipment): WorkOrder['effectiveLocation'] {
  if (!equipment) {
    return null;
  }

  return resolveEffectiveLocation({
    team: mapTeamLocationInput(equipment.teams ?? null),
    equipment: mapEquipmentLocationInput(equipment),
    lastScan: mapLastScanLocation(equipment),
  });
}

function mapAssignedTo(assignee: WorkOrderJoinedProfile): WorkOrder['assignedTo'] {
  if (!assignee?.id || !assignee.name) {
    return null;
  }

  return {
    id: assignee.id,
    name: assignee.name,
    avatarUrl: assignee.avatar_url ?? null,
  };
}

function mapWorkOrderTeam(team: WorkOrderJoinedTeam): WorkOrder['team'] {
  if (!team?.id || !team.name) {
    return null;
  }

  return {
    id: team.id,
    name: team.name,
    description: team.description || undefined,
    location_address: team.location_address,
    location_city: team.location_city,
    location_state: team.location_state,
    location_country: team.location_country,
    location_lat: team.location_lat,
    location_lng: team.location_lng,
  };
}

function mapEmbeddedEquipmentTeam(team: WorkOrderJoinedTeam): WorkOrderEmbeddedEquipment['team'] {
  if (!team?.id) {
    return null;
  }

  return {
    id: team.id,
    name: team.name ?? '',
    description: team.description || undefined,
    override_equipment_location: team.override_equipment_location,
    location_lat: team.location_lat,
    location_lng: team.location_lng,
    location_address: team.location_address,
    location_city: team.location_city,
    location_state: team.location_state,
    location_country: team.location_country,
  };
}

export function mapEmbeddedEquipment(
  equipment: WorkOrderJoinedEquipment,
  organizationId: string,
): WorkOrderEmbeddedEquipment | null {
  if (!equipment?.id) {
    return null;
  }

  return {
    id: equipment.id,
    organization_id: equipment.organization_id ?? organizationId,
    name: equipment.name ?? '',
    manufacturer: equipment.manufacturer ?? null,
    model: equipment.model ?? null,
    serial_number: equipment.serial_number ?? null,
    status: (equipment.status ?? 'active') as WorkOrderEmbeddedEquipment['status'],
    working_hours: equipment.working_hours ?? null,
    image_url: equipment.image_url ?? null,
    team_id: equipment.team_id ?? null,
    location: equipment.location ?? null,
    customer_id: equipment.customer_id ?? null,
    default_pm_template_id: equipment.default_pm_template_id ?? null,
    custom_attributes: equipment.custom_attributes ?? null,
    use_team_location: equipment.use_team_location ?? null,
    last_known_location: equipment.last_known_location ?? null,
    assigned_location_lat: equipment.assigned_location_lat ?? null,
    assigned_location_lng: equipment.assigned_location_lng ?? null,
    assigned_location_street: equipment.assigned_location_street ?? null,
    assigned_location_city: equipment.assigned_location_city ?? null,
    assigned_location_state: equipment.assigned_location_state ?? null,
    assigned_location_country: equipment.assigned_location_country ?? null,
    team: mapEmbeddedEquipmentTeam(equipment.teams ?? null),
  };
}

export function mapJoinedWorkOrderFields(
  assignee: WorkOrderJoinedProfile,
  equipment: WorkOrderJoinedEquipment,
  creator: WorkOrderJoinedProfile,
  organizationId: string,
): Partial<WorkOrder> {
  const team = equipment?.teams ?? null;

  return {
    assigneeName: assignee?.name || undefined,
    teamName: team?.name || undefined,
    equipmentName: equipment?.name || undefined,
    equipmentManufacturer: equipment?.manufacturer || undefined,
    equipmentModel: equipment?.model || undefined,
    equipmentSerialNumber: equipment?.serial_number || undefined,
    equipmentWorkingHours: equipment?.working_hours ?? undefined,
    equipmentImageUrl: equipment?.image_url ?? undefined,
    equipmentTeamId: equipment?.team_id || undefined,
    equipmentTeamName: team?.name || undefined,
    createdByName: creator?.name || undefined,
    createdByAvatarUrl: creator?.avatar_url ?? undefined,
    assignedTo: mapAssignedTo(assignee),
    effectiveLocation: resolveWorkOrderLocation(equipment),
    team: mapWorkOrderTeam(team),
    equipment: mapEmbeddedEquipment(equipment, organizationId),
  };
}

/**
 * Maps raw Supabase row to WorkOrder with computed fields
 */
export function mapWorkOrderRow(wo: Record<string, unknown>): WorkOrder {
  const assignee = wo.assignee as WorkOrderJoinedProfile;
  const equipment = wo.equipment as WorkOrderJoinedEquipment;
  const creator = wo.creator as WorkOrderJoinedProfile;
  const organizationId = wo.organization_id as string;

  return {
    ...mapBaseWorkOrderFields(wo),
    ...mapQuickBooksInvoiceFields(wo),
    ...mapJoinedWorkOrderFields(assignee, equipment, creator, organizationId),
  } as WorkOrder;
}
