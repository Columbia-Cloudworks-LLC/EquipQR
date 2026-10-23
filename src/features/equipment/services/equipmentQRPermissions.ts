import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Role, TeamRole } from '@/types/permissions';
import { getAuthClaims, requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  batchResolveEquipmentDisplayImageUrls,
  extractEquipmentDisplayImagePath,
} from '@/services/imageUploadService';
import { logger } from '@/utils/logger';
import {
  UnassignedQRTagDetectedError,
} from '@/features/equipment/services/equipmentQRTagService';

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
    /** Raw `image_url` from equipment; resolve to a display URL via `resolveEquipmentQRDisplayImageUrl`. */
    imageReference: string | null;
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

export interface ResolveEquipmentQRDisplayImageContext {
  equipmentId: string;
  organizationId: string;
  stored: string | null;
}

function safeString(value: unknown): string {
  try {
    return String(value);
  } catch {
    return '[unstringifiable]';
  }
}

function summarizeResolutionError(error: unknown): { errorName: string; errorMessage: string } {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (error && typeof error === 'object') {
    const errorRecord = error as { constructor?: unknown; message?: unknown; name?: unknown };
    const constructorName =
      typeof errorRecord.constructor === 'function' && typeof errorRecord.constructor.name === 'string'
        ? errorRecord.constructor.name
        : undefined;
    const objectName = typeof errorRecord.name === 'string' && errorRecord.name ? errorRecord.name : undefined;

    return {
      errorName: constructorName || objectName || 'object',
      errorMessage: 'message' in error ? safeString(errorRecord.message) : safeString(error),
    };
  }

  return {
    errorName: typeof error,
    errorMessage: safeString(error),
  };
}

/**
 * Turn canonical private-bucket paths / legacy URLs into browser-ready signed or absolute URLs.
 * Call after the QR landing shell renders so signing is not on the critical path for payload fetch.
 */
export async function resolveEquipmentQRDisplayImageUrl(
  context: ResolveEquipmentQRDisplayImageContext
): Promise<string | null> {
  const { equipmentId, organizationId, stored } = context;
  if (!stored?.trim()) return null;

  try {
    const [resolved] = await batchResolveEquipmentDisplayImageUrls([stored], {
      equipmentIds: [equipmentId],
    });

    if (resolved == null) {
      const imagePath = extractEquipmentDisplayImagePath(stored);
      if (imagePath) {
        logger.error('QR equipment image resolution failed', {
          equipmentId,
          organizationId,
          imagePath,
        });
      }
    }

    return resolved ?? null;
  } catch (error) {
    const imagePath = extractEquipmentDisplayImagePath(stored);
    logger.error('QR equipment image resolution failed', {
      equipmentId,
      organizationId,
      ...(imagePath ? { imagePath } : {}),
      ...summarizeResolutionError(error),
    });
    return null;
  }
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
function buildEquipmentQRPayloadFromRow(
  row: EquipmentQRRow,
  userRole: string,
): EquipmentQRPayload {
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
      imageReference: row.image_url,
      defaultPmTemplateId: row.default_pm_template_id,
      team: firstRelation(row.team),
    },
    organization,
    userRole,
  };
}

interface EquipmentQRTagFallbackRow {
  id: string;
  organization_id: string;
  short_code: string;
  label_batch_name: string | null;
  status: string;
  claimed_equipment_id: string | null;
  created_at: string;
  organizations: OrganizationRelation | OrganizationRelation[];
}

const EQUIPMENT_QR_TAG_SELECT = `
  id,
  organization_id,
  short_code,
  label_batch_name,
  status,
  claimed_equipment_id,
  created_at,
  organizations!inner(id, name, scan_location_collection_enabled)
`;

async function handleResolvedQRTagRow(
  tagRow: EquipmentQRTagFallbackRow,
  userRole: string,
): Promise<EquipmentQRPayload> {
  const organization = firstRelation(tagRow.organizations);
  if (!organization) throw new Error('Equipment organization not found');

  if (tagRow.status === 'claimed' && tagRow.claimed_equipment_id) {
    const { data: claimedEquipment, error: claimedError } = await supabase
      .from('equipment')
      .select(EQUIPMENT_QR_SELECT)
      .eq('organization_id', tagRow.organization_id)
      .eq('id', tagRow.claimed_equipment_id)
      .maybeSingle();

    if (claimedError) throw new Error(claimedError.message);
    if (!claimedEquipment) throw new Error('Claimed equipment not found');

    const claimedRow: EquipmentQRRow = claimedEquipment;
    return buildEquipmentQRPayloadFromRow(claimedRow, userRole);
  }

  throw new UnassignedQRTagDetectedError({
    tag: {
      id: tagRow.id,
      organizationId: tagRow.organization_id,
      shortCode: tagRow.short_code,
      labelBatchName: tagRow.label_batch_name,
      status: tagRow.status === 'claimed' ? 'claimed' : 'unassigned',
      claimedEquipmentId: tagRow.claimed_equipment_id,
      createdAt: tagRow.created_at,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      scanLocationCollectionEnabled: organization.scan_location_collection_enabled,
    },
    userRole,
  });
}

async function resolveQRTagFallbackForOrg(
  tagId: string,
  organizationId: string,
  userRole: string,
): Promise<EquipmentQRPayload | null> {
  const queryBuilder = supabase.from('equipment_qr_tags');
  if (!queryBuilder || typeof queryBuilder.select !== 'function') {
    return null;
  }

  const { data: tagData, error: tagError } = await queryBuilder
    .select(EQUIPMENT_QR_TAG_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', tagId)
    .maybeSingle();

  if (tagError) throw new Error(tagError.message);
  if (!tagData) return null;

  const tagRow: EquipmentQRTagFallbackRow = tagData;
  return handleResolvedQRTagRow(tagRow, userRole);
}

async function resolveQRTagFallbackMultiOrg(
  tagId: string,
  membershipByOrganizationId: Map<string, string>,
): Promise<EquipmentQRPayload | null> {
  const scopedOrganizationIds = [...membershipByOrganizationId.keys()];
  const queryBuilder = supabase.from('equipment_qr_tags');
  if (!queryBuilder || typeof queryBuilder.select !== 'function') {
    return null;
  }

  const { data: tagData, error: tagError } = await queryBuilder
    .select(EQUIPMENT_QR_TAG_SELECT)
    .in('organization_id', scopedOrganizationIds)
    .eq('id', tagId)
    .maybeSingle();

  if (tagError) throw new Error(tagError.message);
  if (!tagData) return null;

  const tagRow: EquipmentQRTagFallbackRow = tagData;
  const scopedRole = membershipByOrganizationId.get(tagRow.organization_id);
  if (!scopedRole) throw new Error('You do not have access to this equipment');

  return handleResolvedQRTagRow(tagRow, scopedRole);
}

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
    if (!data) {
      const tagFallback = await resolveQRTagFallbackForOrg(
        equipmentId,
        organizationId,
        membership.role,
      );
      if (tagFallback) return tagFallback;
      throw new Error('Equipment not found');
    }

    const row: EquipmentQRRow = data;
    return buildEquipmentQRPayloadFromRow(row, membership.role);
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
  if (!data) {
    const tagFallback = await resolveQRTagFallbackMultiOrg(equipmentId, membershipByOrganizationId);
    if (tagFallback) return tagFallback;
    throw new Error('Equipment not found');
  }

  const row: EquipmentQRRow = data;
  const scopedRole = membershipByOrganizationId.get(row.organization_id);
  if (!scopedRole) throw new Error('You do not have access to this equipment');

  return buildEquipmentQRPayloadFromRow(row, scopedRole);
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
): Promise<string> {
  const scannedBy = await requireAuthUserIdFromClaims();
  const { data, error } = await supabase
    .from('scans')
    .insert({
      equipment_id: equipmentId,
      scanned_by: scannedBy,
      location,
      notes,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
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
