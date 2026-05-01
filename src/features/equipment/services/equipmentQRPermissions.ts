import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Role, TeamRole } from '@/types/permissions';
import { getAuthClaims, requireAuthUserIdFromClaims } from '@/lib/authClaims';

type EquipmentStatus = Database['public']['Enums']['equipment_status'];

interface OrganizationRelation {
  id: string;
  name: string;
  scan_location_collection_enabled: boolean;
}

interface TeamRelation {
  id: string;
  name: string;
}

interface EquipmentQRRow {
  id: string;
  organization_id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: EquipmentStatus;
  location: string | null;
  working_hours: number | null;
  image_url: string | null;
  default_pm_template_id: string | null;
  team: TeamRelation | TeamRelation[] | null;
  organizations: OrganizationRelation | OrganizationRelation[];
}

interface OrganizationMembershipRow {
  organization_id: string;
  role: string;
}

export interface EquipmentQRPayload {
  equipment: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    status: EquipmentStatus;
    location: string | null;
    workingHours: number | null;
    imageUrl: string | null;
    defaultPmTemplateId: string | null;
    team: TeamRelation | null;
  };
  organization: OrganizationRelation;
  userRole: string;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const EQUIPMENT_QR_SELECT = `
  id,
  organization_id,
  name,
  manufacturer,
  model,
  serial_number,
  status,
  location,
  working_hours,
  image_url,
  default_pm_template_id,
  team:team_id(id, name),
  organizations!inner(id, name, scan_location_collection_enabled)
`;

/**
 * Fetch the equipment payload for a QR scan landing page.
 *
 * The caller's identity is always derived from the authenticated JWT claims —
 * the `userId` parameter has been intentionally removed to prevent a caller
 * from supplying a different user's ID (RLS on `organization_members` allows
 * any org-member to read other members' rows, so a spoofed ID could yield a
 * `userRole` that does not belong to the current user).
 *
 * When `organizationId` is provided (preferred — QR URLs generated with
 * `equipmentQRPath(id, orgId)` include it as a query param) the lookup is
 * single-org scoped, matching EquipQR's tenant-isolation requirement.
 * When omitted (legacy QR links without `?org=`) a multi-org fallback queries
 * all organizations the authenticated user belongs to.
 */
export async function fetchEquipmentQRPayload(
  equipmentId: string,
  organizationId?: string
): Promise<EquipmentQRPayload> {
  const userId = await requireAuthUserIdFromClaims();

  if (organizationId) {
    // Preferred path: single-org scoped lookup.
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError) throw new Error(membershipError.message);
    if (!membership) throw new Error('You do not have access to this equipment');

    const { data, error } = await supabase
      .from('equipment')
      .select(EQUIPMENT_QR_SELECT)
      .eq('organization_id', organizationId)
      .eq('id', equipmentId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Equipment not found');

    const row = data as unknown as EquipmentQRRow;
    const organization = firstRelation(row.organizations);
    if (!organization) throw new Error('Equipment organization not found');

    return {
      equipment: {
        id: row.id,
        name: row.name,
        manufacturer: row.manufacturer,
        model: row.model,
        serialNumber: row.serial_number,
        status: row.status,
        location: row.location,
        workingHours: row.working_hours,
        imageUrl: row.image_url,
        defaultPmTemplateId: row.default_pm_template_id,
        team: firstRelation(row.team),
      },
      organization,
      userRole: membership.role,
    };
  }

  // Legacy fallback for QR links that predate the `?org=` parameter.
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (membershipError) throw new Error(membershipError.message);
  if (!memberships || memberships.length === 0) {
    throw new Error('You do not have access to this equipment');
  }

  const membershipByOrganizationId = new Map(
    (memberships as OrganizationMembershipRow[]).map((membership) => [membership.organization_id, membership.role])
  );
  const scopedOrganizationIds = [...membershipByOrganizationId.keys()];

  const { data, error } = await supabase
    .from('equipment')
    .select(EQUIPMENT_QR_SELECT)
    .in('organization_id', scopedOrganizationIds)
    .eq('id', equipmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Equipment not found');

  const row = data as unknown as EquipmentQRRow;
  const organization = firstRelation(row.organizations);
  if (!organization) throw new Error('Equipment organization not found');

  const scopedRole = membershipByOrganizationId.get(row.organization_id);
  if (!scopedRole) throw new Error('You do not have access to this equipment');

  return {
    equipment: {
      id: row.id,
      name: row.name,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial_number,
      status: row.status,
      location: row.location,
      workingHours: row.working_hours,
      imageUrl: row.image_url,
      defaultPmTemplateId: row.default_pm_template_id,
      team: firstRelation(row.team),
    },
    organization,
    userRole: scopedRole,
  };
}

export async function userLimitsSensitivePi(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('limit_sensitive_pi')
    .eq('id', userId)
    .maybeSingle();

  // Fail closed: if the query errors or the profile row is absent, treat the
  // user as limiting sensitive PI so the QR scan flow does not attempt
  // geolocation logging when the privacy preference is unknown.
  if (error || data === null || data === undefined) return true;
  return data.limit_sensitive_pi === true;
}

export async function insertScan(
  equipmentId: string,
  location: string | null,
  notes: string
): Promise<void> {
  const scannedBy = await requireAuthUserIdFromClaims();
  const { error } = await supabase.from('scans').insert({
    equipment_id: equipmentId,
    scanned_by: scannedBy,
    location,
    notes,
  });

  if (error) throw new Error(error.message);
}

export type QRActionType = 'pm-work-order' | 'generic-work-order' | 'update-hours' | 'note-image';

export interface QRActionTeamMembership {
  teamId: string;
  role: TeamRole;
}

export interface QRActionPermissionContext {
  userId: string;
  organizationId: string;
  userRole: Role;
  teamMemberships: QRActionTeamMembership[];
}

export interface QRActionEquipment {
  id: string;
  name: string;
  organizationId: string;
  teamId: string | null;
  workingHours: number | null;
  defaultPmTemplateId: string | null;
}

function isOrgAdmin(userRole: Role): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

/** Active org members may use QR quick actions; org viewers are excluded. */
function isActiveOrgMember(userRole: Role): boolean {
  return isOrgAdmin(userRole) || userRole === 'member';
}

function getMembershipForTeam(
  teamMemberships: QRActionTeamMembership[],
  teamId: string | null | undefined
): QRActionTeamMembership | null {
  if (!teamId) return null;
  return teamMemberships.find(membership => membership.teamId === teamId) ?? null;
}

/** Team roles that may create work orders from the QR scan flow (excludes read-only viewer). */
const QR_WORK_ORDER_TEAM_ROLES: readonly TeamRole[] = ['owner', 'manager', 'technician', 'requestor'];

/** Team roles that may add notes or images from the QR scan flow (field documentation). */
const QR_NOTE_IMAGE_TEAM_ROLES: readonly TeamRole[] = ['owner', 'manager', 'technician'];

function teamRoleCanCreateQrWorkOrder(role: TeamRole | undefined): boolean {
  return role !== undefined && QR_WORK_ORDER_TEAM_ROLES.includes(role);
}

function teamRoleCanAddQrNoteImage(role: TeamRole | undefined): boolean {
  return role !== undefined && QR_NOTE_IMAGE_TEAM_ROLES.includes(role);
}

export function canRunQRAction(
  action: QRActionType,
  context: QRActionPermissionContext,
  equipmentTeamId: string | null | undefined
): boolean {
  if (!isActiveOrgMember(context.userRole)) return false;
  if (isOrgAdmin(context.userRole)) return true;

  // update-hours requires team owner/manager regardless of team assignment;
  // unteamed equipment has no team role, so plain org members are denied.
  if (action === 'update-hours') {
    const teamMembership = getMembershipForTeam(context.teamMemberships, equipmentTeamId);
    return teamMembership?.role === 'owner' || teamMembership?.role === 'manager';
  }

  if (!equipmentTeamId) return true;

  const teamMembership = getMembershipForTeam(context.teamMemberships, equipmentTeamId);

  if (!teamMembership) return false;

  if (action === 'pm-work-order' || action === 'generic-work-order') {
    return teamRoleCanCreateQrWorkOrder(teamMembership.role);
  }

  if (action === 'note-image') {
    return teamRoleCanAddQrNoteImage(teamMembership.role);
  }

  return false;
}

export async function fetchQRActionTeamMemberships(
  organizationId: string,
  userRole: Role,
  equipmentTeamId: string | null | undefined
): Promise<QRActionTeamMembership[]> {
  if (!equipmentTeamId || isOrgAdmin(userRole)) {
    return [];
  }

  const claims = await getAuthClaims();
  if (!claims?.sub) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_user_team_memberships', {
    user_uuid: claims.sub,
    org_id: organizationId,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map(membership => ({
    teamId: membership.team_id,
    role: membership.role,
  }));
}
