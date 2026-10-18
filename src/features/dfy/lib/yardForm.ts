import { parseEquipmentCsv, resolveEquipmentRows, resolveManifest, resolveStaffRows } from '@/dev/dfy/manifest.mjs';
import type { DfyEquipmentInput, DfyStaffInput, DfyStaffRole, DfyTeamRole } from '@/features/dfy/services/dfyProvisioningService';

/**
 * Turns the operator's form input into a validated provisioning request using
 * the same manifest rules as dev/dfy/manifest.mjs (one source of truth).
 *
 * Staff lines: `email, role[, teamRole]`, one per line. Roles: owner, admin,
 * mechanic, technician, member (the last three become organization members).
 */

export interface YardFormInput {
  name: string;
  teamName: string;
  staffText: string;
  equipmentCsv: string;
}

export interface ResolvedYard {
  name: string;
  teamName: string;
  staff: DfyStaffInput[];
  equipment: DfyEquipmentInput[];
}

export type YardFormResult = { ok: true; yard: ResolvedYard } | { ok: false; errors: string[] };

type EquipmentStatus = NonNullable<DfyEquipmentInput['status']>;

const STAFF_ROLES: readonly DfyStaffRole[] = ['owner', 'admin', 'member'];
const TEAM_ROLES: readonly DfyTeamRole[] = ['manager', 'technician', 'requestor', 'viewer'];
const EQUIPMENT_STATUSES: readonly EquipmentStatus[] = ['active', 'maintenance', 'inactive'];

function isStaffRole(value: string): value is DfyStaffRole {
  return STAFF_ROLES.some((role) => role === value);
}

function isTeamRole(value: string): value is DfyTeamRole {
  return TEAM_ROLES.some((role) => role === value);
}

function isEquipmentStatus(value: string): value is EquipmentStatus {
  return EQUIPMENT_STATUSES.some((status) => status === value);
}

type ResolvedStaffRow = ReturnType<typeof resolveStaffRows>['staff'][number];
type ResolvedEquipmentRow = ReturnType<typeof resolveEquipmentRows>['equipment'][number];

function toStaffInput(row: ResolvedStaffRow): DfyStaffInput {
  return {
    email: row.email,
    role: isStaffRole(row.role) ? row.role : 'member',
    teamRole: row.teamRole && isTeamRole(row.teamRole) ? row.teamRole : null,
  };
}

function toEquipmentInput(row: ResolvedEquipmentRow): DfyEquipmentInput {
  return {
    name: row.name,
    manufacturer: row.manufacturer || undefined,
    model: row.model || undefined,
    serialNumber: row.serial_number || undefined,
    location: row.location || undefined,
    installationDate: row.installation_date,
    status: isEquipmentStatus(row.status) ? row.status : 'active',
    notes: row.notes ?? undefined,
    importId: row.import_id ?? undefined,
  };
}

/**
 * Validate one `email, role[, teamRole]` line for adding a person to an existing
 * yard. An owner is allowed so a mistaken owner can be replaced after removal;
 * the database still refuses a second live owner.
 */
export function resolveStaffLine(
  line: string,
): { ok: true; person: DfyStaffInput } | { ok: false; errors: string[] } {
  const rows = parseStaffLines(line);
  if (rows.length !== 1) return { ok: false, errors: ['Enter one person: email, role'] };
  const result = resolveStaffRows(rows);
  if (result.errors.length > 0) return { ok: false, errors: result.errors };
  return { ok: true, person: toStaffInput(result.staff[0]) };
}

/** Validate an equipment CSV for adding to an existing yard. */
export function resolveEquipmentCsv(
  csv: string,
  today?: string,
): { ok: true; equipment: DfyEquipmentInput[] } | { ok: false; errors: string[] } {
  try {
    const result = resolveEquipmentRows(parseEquipmentCsv(csv), { today });
    if (result.errors.length > 0) return { ok: false, errors: result.errors };
    if (result.equipment.length === 0) return { ok: false, errors: ['The CSV has no equipment rows'] };
    return { ok: true, equipment: result.equipment.map(toEquipmentInput) };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

export function parseStaffLines(text: string): Array<{ email: string; role: string; teamRole?: string }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const [email = '', role = '', teamRole] = line.split(/[,\t]/).map((part) => part.trim());
      return teamRole ? { email, role, teamRole } : { email, role };
    });
}

export function resolveYardForm(input: YardFormInput, today?: string): YardFormResult {
  let equipmentFromCsv: Array<Record<string, string>>;
  try {
    equipmentFromCsv = input.equipmentCsv.trim() ? parseEquipmentCsv(input.equipmentCsv) : [];
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }

  try {
    const plan = resolveManifest(
      { organization: { name: input.name }, team: { name: input.teamName }, staff: parseStaffLines(input.staffText) },
      { equipmentFromCsv, today },
    );

    return {
      ok: true,
      yard: {
        name: plan.organization.name,
        teamName: plan.teamName,
        staff: plan.staff.map(toStaffInput),
        equipment: plan.equipment.map(toEquipmentInput),
      },
    };
  } catch (error) {
    const validationErrors =
      error instanceof Error && 'validationErrors' in error && Array.isArray(error.validationErrors)
        ? error.validationErrors.map(String)
        : [error instanceof Error ? error.message : String(error)];
    return { ok: false, errors: validationErrors };
  }
}
