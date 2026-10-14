/**
 * Pure helpers for Done-For-You yard provisioning (issue #1648).
 *
 * The CLI (dev/dfy/provision-yard.mjs) reads a manifest, validates it with
 * these helpers, and only then talks to Supabase. Keeping this module free of
 * I/O lets the validation and row mapping be unit tested.
 */

import Papa from 'papaparse';

/** Manifest staff role → organization_members.role */
const STAFF_ROLE_MAP = Object.freeze({
  owner: 'owner',
  admin: 'admin',
  member: 'member',
  mechanic: 'member',
  technician: 'member',
});

const TEAM_ROLES = new Set(['manager', 'technician', 'requestor', 'viewer']);
const EQUIPMENT_STATUSES = new Set(['active', 'maintenance', 'inactive']);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Same prefix rule as the app's CSV exporters (formula-injection guard). */
const CSV_FORMULA_PREFIX_RE = /^\s*[=+\-@]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEFAULT_TEAM_NAME = 'Main Yard';
export const DEFAULT_LOCATION = 'Yard';
export const MIN_MAX_MEMBERS = 5;

/** CSV header aliases → canonical equipment field. */
const CSV_HEADER_ALIASES = Object.freeze({
  name: 'name',
  equipment: 'name',
  equipment_name: 'name',
  unit: 'name',
  manufacturer: 'manufacturer',
  make: 'manufacturer',
  model: 'model',
  serial: 'serialNumber',
  serial_number: 'serialNumber',
  serialnumber: 'serialNumber',
  vin: 'serialNumber',
  location: 'location',
  installation_date: 'installationDate',
  installationdate: 'installationDate',
  in_service_date: 'installationDate',
  status: 'status',
  notes: 'notes',
  import_id: 'importId',
  importid: 'importId',
});

/** @param {string} email */
export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * True only for a real calendar date in YYYY-MM-DD form (rejects 2026-02-31).
 * @param {string} value
 */
export function isIsoCalendarDate(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** @param {string} header */
function canonicalHeader(header) {
  const key = String(header ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CSV_HEADER_ALIASES[key] ?? null;
}

/**
 * Parse an equipment CSV into manifest-style equipment objects.
 * Unknown columns are ignored.
 *
 * @param {string} csvText
 * @returns {Array<Record<string, string>>}
 */
export function parseEquipmentCsv(csvText) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`Equipment CSV row ${(first.row ?? 0) + 2}: ${first.message}`);
  }

  return parsed.data.map((row) => {
    /** @type {Record<string, string>} */
    const out = {};
    for (const [header, value] of Object.entries(row)) {
      const field = canonicalHeader(header);
      if (field && typeof value === 'string' && value.trim() !== '') {
        out[field] = value.trim();
      }
    }
    return out;
  });
}

/**
 * Validate a provisioning manifest and resolve it into insertable shapes.
 *
 * @param {unknown} manifest
 * @param {{ equipmentFromCsv?: Array<Record<string, string>>, today?: string }} [options]
 */
export function resolveManifest(manifest, options = {}) {
  /** @type {string[]} */
  const errors = [];
  const m = /** @type {Record<string, any>} */ (manifest ?? {});
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  const orgName = typeof m.organization?.name === 'string' ? m.organization.name.trim() : '';
  if (!orgName) errors.push('organization.name is required');

  const teamName =
    typeof m.team?.name === 'string' && m.team.name.trim() ? m.team.name.trim() : DEFAULT_TEAM_NAME;

  const rawEquipment = [
    ...(Array.isArray(m.equipment) ? m.equipment : []),
    ...(options.equipmentFromCsv ?? []),
  ];

  const seenSerials = new Set();
  const equipment = rawEquipment.map((row, index) => {
    const label = `equipment[${index}]`;
    const name = String(row?.name ?? '').trim();
    if (!name) errors.push(`${label}: name is required`);

    const serialNumber = String(row?.serialNumber ?? row?.serial_number ?? '').trim();
    if (serialNumber) {
      const key = serialNumber.toLowerCase();
      if (seenSerials.has(key)) errors.push(`${label}: duplicate serial number "${serialNumber}"`);
      seenSerials.add(key);
    }

    const installationDate = String(row?.installationDate ?? row?.installation_date ?? '').trim() || today;
    if (!isIsoCalendarDate(installationDate)) {
      errors.push(`${label}: installationDate must be a valid YYYY-MM-DD date (got "${installationDate}")`);
    }

    const status = String(row?.status ?? 'active').trim().toLowerCase();
    if (!EQUIPMENT_STATUSES.has(status)) {
      errors.push(`${label}: status must be one of ${[...EQUIPMENT_STATUSES].join(', ')}`);
    }

    const notes = String(row?.notes ?? '').trim();
    const importId = String(row?.importId ?? row?.import_id ?? '').trim();

    return {
      name,
      manufacturer: String(row?.manufacturer ?? '').trim(),
      model: String(row?.model ?? '').trim(),
      serial_number: serialNumber,
      location: String(row?.location ?? '').trim() || DEFAULT_LOCATION,
      installation_date: installationDate,
      status,
      notes: notes || null,
      import_id: importId || null,
    };
  });

  const seenEmails = new Set();
  let ownerCount = 0;
  const staff = (Array.isArray(m.staff) ? m.staff : []).map((row, index) => {
    const label = `staff[${index}]`;
    const email = normalizeEmail(row?.email);
    if (!EMAIL_RE.test(email)) errors.push(`${label}: a valid email is required`);
    if (seenEmails.has(email)) errors.push(`${label}: duplicate email "${email}"`);
    seenEmails.add(email);

    const manifestRole = String(row?.role ?? '').trim().toLowerCase();
    const role = STAFF_ROLE_MAP[/** @type {keyof typeof STAFF_ROLE_MAP} */ (manifestRole)];
    if (!role) {
      errors.push(`${label}: role must be one of ${Object.keys(STAFF_ROLE_MAP).join(', ')}`);
    }
    if (role === 'owner') ownerCount += 1;

    // Mechanics go on the yard team as technicians unless told otherwise;
    // owners/admins already have org-wide access and only join when asked.
    const explicitTeamRole = row?.teamRole ? String(row.teamRole).trim().toLowerCase() : null;
    if (explicitTeamRole && !TEAM_ROLES.has(explicitTeamRole)) {
      errors.push(`${label}: teamRole must be one of ${[...TEAM_ROLES].join(', ')}`);
    }
    const teamRole = explicitTeamRole ?? (role === 'member' ? 'technician' : null);

    return { email, role: role ?? 'member', teamRole };
  });

  if (ownerCount === 0) errors.push('staff must include exactly one owner');
  if (ownerCount > 1) errors.push('staff must include exactly one owner (found more than one)');

  const requestedMax = Number.isInteger(m.organization?.maxMembers) ? m.organization.maxMembers : 0;
  const maxMembers = Math.max(MIN_MAX_MEMBERS, staff.length, requestedMax);

  if (errors.length > 0) {
    const error = new Error(`Invalid provisioning manifest:\n  - ${errors.join('\n  - ')}`);
    /** @type {any} */ (error).validationErrors = errors;
    throw error;
  }

  return { organization: { name: orgName, maxMembers }, teamName, equipment, staff };
}

/**
 * Absolute QR URL for an equipment label (matches src/utils/qr.ts equipmentQRPath).
 *
 * @param {string} appUrl
 * @param {string} equipmentId
 * @param {string} organizationId
 */
export function equipmentQrUrl(appUrl, equipmentId, organizationId) {
  const origin = String(appUrl).replace(/\/+$/, '');
  return `${origin}/qr/equipment/${encodeURIComponent(equipmentId)}?org=${encodeURIComponent(organizationId)}`;
}

/**
 * Label-printing CSV for the provisioned equipment.
 *
 * @param {Array<{ id: string, name: string, serial_number: string, manufacturer: string, model: string }>} rows
 * @param {{ appUrl: string, organizationId: string }} context
 */
export function buildLabelsCsv(rows, { appUrl, organizationId }) {
  return Papa.unparse(
    rows.map((row) => ({
      equipment_id: row.id,
      name: row.name,
      manufacturer: row.manufacturer,
      model: row.model,
      serial_number: row.serial_number,
      qr_url: equipmentQrUrl(appUrl, row.id, organizationId),
      qr_svg: `qr/${row.id}.svg`,
    })),
    {
      columns: ['equipment_id', 'name', 'manufacturer', 'model', 'serial_number', 'qr_url', 'qr_svg'],
      // Values come from customer spreadsheets and the output is opened in one.
      escapeFormulae: CSV_FORMULA_PREFIX_RE,
    },
  );
}

/** @param {string} name */
export function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'yard'
  );
}
