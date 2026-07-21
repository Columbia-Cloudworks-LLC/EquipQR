#!/usr/bin/env node
/**
 * Cloud-safe Quick Login seed for ephemeral Supabase branches.
 *
 * Hosted Auth blocks direct auth.users SQL inserts. This script creates the
 * Dev Quick Login personas via Auth Admin API, then upgrades the trigger-created
 * personal org for the primary smoke persona with a team + equipment row.
 *
 * Safety: refuses parent/production project refs and supabase.equipqr.app.
 *
 * service_role (approved DX exception): Auth Admin on the *ephemeral* branch
 * only — never parent/prod. Same class of CLI exception as upload-screenshot.ts.
 * Do not move this into a production Edge Function (that would widen blast radius).
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export const PARENT_PROJECT_REF = 'ymxkzronkhwxzcdcbnwq';

/**
 * Same password contract as DevQuickLogin.tsx / local supabase seeds.
 * Callers must set CLOUD_AGENT_QUICK_LOGIN_PASSWORD or VITE_DEV_TEST_PASSWORD
 * (the stack script exports the Dev Quick Login default when unset).
 */
export function resolveDevPassword() {
  const value =
    process.env.CLOUD_AGENT_QUICK_LOGIN_PASSWORD ||
    process.env.VITE_DEV_TEST_PASSWORD;
  if (!value) {
    throw new Error(
      'Set CLOUD_AGENT_QUICK_LOGIN_PASSWORD or VITE_DEV_TEST_PASSWORD before seeding',
    );
  }
  return value;
}

/** Dev Quick Login personas (emails match DevQuickLogin.tsx; password via env). */
export const QUICK_LOGIN_PERSONAS = [
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440001',
    email: 'owner@apex.test',
    name: 'Alex Apex',
    organizationName: 'Apex Construction Company',
    plan: 'premium',
    seedFleet: true,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440002',
    email: 'admin@apex.test',
    name: 'Amanda Admin',
    organizationName: "Amanda's Equipment Services",
    plan: 'free',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440003',
    email: 'tech@apex.test',
    name: 'Tom Technician',
    organizationName: "Tom's Field Services",
    plan: 'free',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440004',
    email: 'owner@metro.test',
    name: 'Marcus Metro',
    organizationName: 'Metro Equipment Services',
    plan: 'premium',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440005',
    email: 'tech@metro.test',
    name: 'Mike Mechanic',
    organizationName: "Mike's Repair Shop",
    plan: 'free',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440006',
    email: 'owner@valley.test',
    name: 'Victor Valley',
    organizationName: 'Valley Landscaping',
    plan: 'free',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440007',
    email: 'owner@industrial.test',
    name: 'Irene Industrial',
    organizationName: 'Industrial Rentals Corp',
    plan: 'premium',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440008',
    email: 'multi@equipqr.test',
    name: 'Multi Org User',
    organizationName: 'Multi Org Consulting',
    plan: 'free',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440009',
    email: 'owner@freshstart.test',
    name: 'Fresh Start Owner',
    organizationName: 'Fresh Start Equipment',
    plan: 'free',
    seedFleet: false,
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440010',
    email: 'e2e.invitee.pending@apex.test',
    name: 'E2E Pending Invitee',
    organizationName: 'Invitee Personal Workspace',
    plan: 'free',
    seedFleet: false,
  },
];

export function assertBranchSafeTarget({ projectRef, apiUrl }) {
  const ref = String(projectRef || '').trim();
  if (!ref) {
    throw new Error('projectRef is required');
  }
  if (ref === PARENT_PROJECT_REF) {
    throw new Error(
      `Refusing to seed parent/production project ${PARENT_PROJECT_REF}`,
    );
  }

  let parsed;
  try {
    parsed = new URL(String(apiUrl || '').trim());
  } catch {
    throw new Error(`Invalid API URL: ${apiUrl}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('API URL must not include credentials');
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal) {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unexpected local API protocol: ${parsed.protocol}`);
    }
    return;
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Hosted API URL must use https');
  }
  if (host === 'supabase.equipqr.app') {
    throw new Error('Refusing to seed production custom domain supabase.equipqr.app');
  }
  const expectedHost = `${ref.toLowerCase()}.supabase.co`;
  if (host !== expectedHost) {
    throw new Error(
      `API host ${host} does not match expected branch host ${expectedHost}`,
    );
  }
}

/**
 * Parse Management API /api-keys?reveal=true payload into anon + service_role.
 */
export function parseProjectApiKeys(keysPayload) {
  const keys = Array.isArray(keysPayload) ? keysPayload : [];
  const byName = new Map();
  for (const entry of keys) {
    const name = String(entry?.name || entry?.type || '').toLowerCase();
    const value = entry?.api_key || entry?.apiKey || entry?.key;
    if (name && value) {
      byName.set(name, value);
    }
  }

  const anon =
    byName.get('anon') ||
    byName.get('legacy anon') ||
    [...byName.entries()].find(([name]) => name.includes('anon'))?.[1];

  const serviceRole =
    byName.get('service_role') ||
    byName.get('service role') ||
    [...byName.entries()].find(([name]) => name.includes('service'))?.[1];

  if (!anon || !serviceRole) {
    throw new Error(
      `Could not resolve anon/service_role from api-keys payload (names: ${[...byName.keys()].join(', ') || 'none'})`,
    );
  }

  return { anonKey: anon, serviceRoleKey: serviceRole };
}

/**
 * Extract the first parseable JSON value from noisy Supabase CLI stdout.
 */
export function extractCliJson(rawText) {
  const cleaned = String(rawText || '').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');

  const tryParseFrom = (startIndex) => {
    let slice = cleaned.slice(startIndex).trim();
    while (slice.length > 0) {
      try {
        return JSON.parse(slice);
      } catch {
        slice = slice.slice(0, -1).trimEnd();
      }
    }
    return null;
  };

  const markers = [
    '"project_ref"',
    '"preview_project_status"',
    '"parent_project_ref"',
    '"created_at"',
    '"SUPABASE_ANON_KEY"',
    '"SUPABASE_URL"',
  ];

  for (const marker of markers) {
    const markerIndex = cleaned.indexOf(marker);
    if (markerIndex === -1) continue;
    for (let i = markerIndex; i >= 0; i -= 1) {
      const ch = cleaned[i];
      if (ch !== '{' && ch !== '[') continue;
      const parsed = tryParseFrom(i);
      if (parsed !== null) return parsed;
    }
  }

  const starts = [cleaned.indexOf('{'), cleaned.indexOf('[')].filter((i) => i >= 0);
  for (const start of starts.sort((a, b) => a - b)) {
    const parsed = tryParseFrom(start);
    if (parsed !== null) return parsed;
  }

  throw new Error('Could not parse JSON payload from CLI output');
}

/** Shell-safe anon key only — never emit service_role on stdout. */
export function formatAnonKeyAssignment(anonKey) {
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
  return `anon_key=${shellQuote(anonKey)}`;
}

/** Accept Management API key list or `branches get` credential object. */
export function resolveKeysFromPayload(raw) {
  if (Array.isArray(raw)) {
    return parseProjectApiKeys(raw);
  }
  if (!raw || typeof raw !== 'object') {
    return { anonKey: undefined, serviceRoleKey: undefined };
  }
  return {
    anonKey: raw.SUPABASE_ANON_KEY || raw.anon_key || undefined,
    serviceRoleKey:
      raw.SUPABASE_SERVICE_ROLE_KEY || raw.service_role_key || undefined,
  };
}

/** Normalize Management API / CLI branch list shapes. */
export function normalizeBranchList(list) {
  if (Array.isArray(list)) return list;
  if (!list || typeof list !== 'object') return [];
  const nested = list.branches || list.data || list.projects;
  return Array.isArray(nested) ? nested : [];
}

export function findBranchByName(list, branchName) {
  return (
    normalizeBranchList(list).find((branch) => branch?.name === branchName) || null
  );
}

function log(message) {
  // stderr so stdout can carry shell assignments (anon key only) for eval.
  console.error(`  [cloud-seed] ${message}`);
}

export async function fetchProjectApiKeys(projectRef, accessToken) {
  const ref = String(projectRef || '').trim();
  const token = String(accessToken || '').trim();
  if (!ref || !token) {
    throw new Error('projectRef and SUPABASE_ACCESS_TOKEN are required to fetch API keys');
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/api-keys?reveal=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Management API api-keys failed (${response.status})`);
  }
  const keys = resolveKeysFromPayload(await response.json());
  if (!keys.anonKey || !keys.serviceRoleKey) {
    throw new Error('Management API api-keys response missing anon or service_role');
  }
  return keys;
}

async function ensureAuthUser(admin, persona) {
  const password = resolveDevPassword();
  const meta = {
    name: persona.name,
    organization_name: persona.organizationName,
  };

  const { data: byIdData, error: byIdError } = await admin.auth.admin.getUserById(
    persona.id,
  );
  if (!byIdError && byIdData?.user) {
    const { error: updateError } = await admin.auth.admin.updateUserById(
      byIdData.user.id,
      {
        email: persona.email,
        password,
        email_confirm: true,
        user_metadata: meta,
      },
    );
    if (updateError) {
      throw new Error(`updateUserById(${persona.email}) failed: ${updateError.message}`);
    }
    return byIdData.user.id;
  }

  let page = 1;
  while (page <= 20) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listError) {
      throw new Error(`listUsers failed: ${listError.message}`);
    }
    const users = listed?.users || [];
    const existing = users.find(
      (user) =>
        String(user.email || '').toLowerCase() === persona.email.toLowerCase(),
    );
    if (existing) {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        existing.id,
        {
          email: persona.email,
          password,
          email_confirm: true,
          user_metadata: meta,
        },
      );
      if (updateError) {
        throw new Error(`updateUserById(${persona.email}) failed: ${updateError.message}`);
      }
      return existing.id;
    }
    if (users.length < 200) break;
    page += 1;
  }

  const { data, error } = await admin.auth.admin.createUser({
    id: persona.id,
    email: persona.email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) {
    throw new Error(`createUser(${persona.email}) failed: ${error.message}`);
  }
  return data.user.id;
}

async function getOwnerOrgId(admin, userId) {
  const { data, error } = await admin
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`organization_members lookup failed: ${error.message}`);
  }
  if (!data?.organization_id) {
    throw new Error(`No owner membership found for user ${userId}`);
  }
  return data.organization_id;
}

async function upgradeOrg(admin, orgId, persona, userId) {
  const { error: orgError } = await admin
    .from('organizations')
    .update({
      name: persona.organizationName,
      plan: persona.plan,
      max_members: persona.plan === 'premium' ? 50 : 5,
      features: [
        'Equipment Management',
        'Work Orders',
        'Team Management',
        ...(persona.plan === 'premium' ? ['Fleet Tracking', 'Preventive Maintenance'] : []),
      ],
    })
    .eq('id', orgId);

  if (orgError) {
    throw new Error(`organizations update failed: ${orgError.message}`);
  }

  const { error: memberError } = await admin
    .from('organization_members')
    .update({
      product_onboarding_completed_at: '2024-01-01T00:00:00.000Z',
    })
    .eq('organization_id', orgId)
    .eq('user_id', userId);

  if (memberError) {
    throw new Error(`organization_members onboarding update failed: ${memberError.message}`);
  }
}

/** Stable serial for idempotent cloud-agent fleet seed (not a local-fixture UUID). */
export const CLOUD_AGENT_EQUIPMENT_SERIAL = 'CAT320GC-CLOUD-AGENT-001';
const CLOUD_AGENT_TEAM_NAME = 'Heavy Equipment Team';

/**
 * Ensure a smoke team + CAT 320 exists for the primary persona org.
 * Uses fresh random UUIDs and insert-if-missing — never upserts canonical
 * local-seed fixture IDs (880e/aa0e/dd0e…), which would overwrite shared rows
 * if a branch ever retained seed data.
 */
/** First matching id; tolerates duplicate rows (no unique constraint on filters). */
async function findFirstId(query, label) {
  const { data, error } = await query.limit(1);
  if (error) {
    throw new Error(`${label} lookup failed: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id ?? null;
}

async function ensureFleet(admin, orgId, ownerUserId) {
  const existingEqId = await findFirstId(
    admin
      .from('equipment')
      .select('id')
      .eq('organization_id', orgId)
      .eq('serial_number', CLOUD_AGENT_EQUIPMENT_SERIAL)
      .order('created_at', { ascending: true }),
    'equipment',
  );

  let teamId = await findFirstId(
    admin
      .from('teams')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', CLOUD_AGENT_TEAM_NAME)
      .order('created_at', { ascending: true }),
    'teams',
  );

  if (!teamId) {
    teamId = randomUUID();
    const { error: teamError } = await admin.from('teams').insert({
      id: teamId,
      organization_id: orgId,
      name: CLOUD_AGENT_TEAM_NAME,
      description: 'Cloud-agent smoke team',
      location_city: 'Dallas',
      location_state: 'TX',
      location_country: 'United States',
      location_lat: 32.776664,
      location_lng: -96.796988,
      override_equipment_location: true,
    });
    if (teamError) {
      throw new Error(`teams insert failed: ${teamError.message}`);
    }
  }

  const existingMemberId = await findFirstId(
    admin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', ownerUserId)
      .order('joined_date', { ascending: true }),
    'team_members',
  );
  if (!existingMemberId) {
    const { error: tmError } = await admin.from('team_members').insert({
      id: randomUUID(),
      team_id: teamId,
      user_id: ownerUserId,
      role: 'manager',
      joined_date: '2024-01-01T00:00:00.000Z',
    });
    if (tmError) {
      throw new Error(`team_members insert failed: ${tmError.message}`);
    }
  }

  if (!existingEqId) {
    const { error: eqError } = await admin.from('equipment').insert({
      id: randomUUID(),
      organization_id: orgId,
      team_id: teamId,
      name: 'CAT 320 Excavator',
      manufacturer: 'Caterpillar',
      model: '320 GC',
      serial_number: CLOUD_AGENT_EQUIPMENT_SERIAL,
      status: 'active',
      location: 'Dallas, TX',
      installation_date: '2023-03-15',
      working_hours: 100,
      custom_attributes: {},
    });
    if (eqError) {
      throw new Error(`equipment insert failed: ${eqError.message}`);
    }
  }

  return { teamId };
}

function seedImageMime(ext) {
  switch (String(ext || '').toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Upload TopBar workspace branding for cloud-agent smoke.
 * Mix: Apex + Metro get org logos; Apex Heavy Equipment team gets an image;
 * Valley / Industrial stay without logos so fallback icons remain testable.
 *
 * Applies by organization/team **name** across all matching rows so duplicate
 * fixture + trigger-created orgs on reused branches still get branding.
 */
async function ensureWorkspaceBranding(admin, { apexOrgId, apexTeamId, metroOrgId }) {
  const apexLogoPath = path.join(
    REPO_ROOT,
    'supabase/seed-images/organizations/660e8400-e29b-41d4-a716-446655440000.png',
  );
  const metroLogoPath = path.join(
    REPO_ROOT,
    'supabase/seed-images/organizations/660e8400-e29b-41d4-a716-446655440001.png',
  );
  const teamImagePath = path.join(
    REPO_ROOT,
    'supabase/seed-images/teams/880e8400-e29b-41d4-a716-446655440000.png',
  );

  const apexOrgIds = new Set(
    await findOrganizationIdsByName(admin, 'Apex Construction Company'),
  );
  if (apexOrgId) apexOrgIds.add(apexOrgId);

  const metroOrgIds = new Set(
    await findOrganizationIdsByName(admin, 'Metro Equipment Services'),
  );
  if (metroOrgId) metroOrgIds.add(metroOrgId);

  if (fs.existsSync(apexLogoPath)) {
    for (const orgId of apexOrgIds) {
      await uploadOrganizationLogo(admin, orgId, apexLogoPath);
    }
    if (apexOrgIds.size > 0) {
      log(`Seeded Apex organization logo (${apexOrgIds.size} org row(s))`);
    }
  }

  if (fs.existsSync(metroLogoPath)) {
    for (const orgId of metroOrgIds) {
      await uploadOrganizationLogo(admin, orgId, metroLogoPath);
    }
    if (metroOrgIds.size > 0) {
      log(`Seeded Metro organization logo (${metroOrgIds.size} org row(s); no team image — fallback mix)`);
    }
  }

  if (fs.existsSync(teamImagePath)) {
    const heavyTeams = await findHeavyEquipmentTeams(admin, [...apexOrgIds]);
    if (apexOrgId && apexTeamId) {
      heavyTeams.push({ orgId: apexOrgId, teamId: apexTeamId });
    }
    const seen = new Set();
    for (const { orgId, teamId } of heavyTeams) {
      const key = `${orgId}:${teamId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await uploadTeamImage(admin, orgId, teamId, teamImagePath);
    }
    if (seen.size > 0) {
      log(`Seeded Apex Heavy Equipment team image (${seen.size} team row(s))`);
    }
  }
}

async function findOrganizationIdsByName(admin, name) {
  const { data, error } = await admin
    .from('organizations')
    .select('id')
    .eq('name', name);
  if (error) {
    throw new Error(`organizations lookup by name failed: ${error.message}`);
  }
  return (data || []).map((row) => row.id).filter(Boolean);
}

async function findHeavyEquipmentTeams(admin, orgIds) {
  if (!orgIds.length) return [];
  const { data, error } = await admin
    .from('teams')
    .select('id, organization_id')
    .eq('name', CLOUD_AGENT_TEAM_NAME)
    .in('organization_id', orgIds);
  if (error) {
    throw new Error(`teams lookup for branding failed: ${error.message}`);
  }
  return (data || [])
    .filter((row) => row.id && row.organization_id)
    .map((row) => ({ orgId: row.organization_id, teamId: row.id }));
}

async function uploadOrganizationLogo(admin, orgId, localPath) {
  const ext = path.extname(localPath).slice(1).toLowerCase() || 'png';
  const objectPath = `${orgId}/logo.${ext}`;
  const bytes = fs.readFileSync(localPath);
  const { error } = await admin.storage.from('organization-logos').upload(objectPath, bytes, {
    contentType: seedImageMime(ext),
    upsert: true,
  });
  if (error) {
    throw new Error(`organization logo upload failed: ${error.message}`);
  }
  const { data } = admin.storage.from('organization-logos').getPublicUrl(objectPath);
  const { error: updateError } = await admin
    .from('organizations')
    .update({ logo: `${data.publicUrl}?v=${Date.now()}`, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (updateError) {
    throw new Error(`organizations.logo update failed: ${updateError.message}`);
  }
}

async function uploadTeamImage(admin, orgId, teamId, localPath) {
  const ext = path.extname(localPath).slice(1).toLowerCase() || 'png';
  const objectPath = `${orgId}/${teamId}/image.${ext}`;
  const bytes = fs.readFileSync(localPath);
  const { error } = await admin.storage.from('team-images').upload(objectPath, bytes, {
    contentType: seedImageMime(ext),
    upsert: true,
  });
  if (error) {
    throw new Error(`team image upload failed: ${error.message}`);
  }
  const { error: updateError } = await admin
    .from('teams')
    .update({ image_url: objectPath, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('organization_id', orgId);
  if (updateError) {
    throw new Error(`teams.image_url update failed: ${updateError.message}`);
  }
}

/**
 * Add owner@apex as member of other premium orgs so multi-org switcher has content.
 * Best-effort; failures are logged and ignored for smoke.
 */
async function ensureApexCrossMemberships(admin, apexUserId, orgIdsByEmail) {
  const targets = ['owner@metro.test', 'owner@industrial.test'];
  for (const email of targets) {
    const orgId = orgIdsByEmail.get(email);
    if (!orgId) continue;

    const { data: existing, error: lookupError } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', apexUserId)
      .maybeSingle();
    if (lookupError) {
      log(`WARN cross-membership lookup ${email}: ${lookupError.message}`);
      continue;
    }
    if (existing?.id) continue;

    const { error } = await admin.from('organization_members').insert({
      id: randomUUID(),
      organization_id: orgId,
      user_id: apexUserId,
      role: 'member',
      status: 'active',
      joined_date: '2024-01-20T00:00:00.000Z',
      product_onboarding_completed_at: '2024-01-01T00:00:00.000Z',
    });
    if (error && !/duplicate|conflict/i.test(error.message)) {
      log(`WARN cross-membership into ${email} org: ${error.message}`);
    }
  }
}

export async function seedQuickLogin({
  apiUrl,
  serviceRoleKey,
  projectRef,
  personas = QUICK_LOGIN_PERSONAS,
}) {
  assertBranchSafeTarget({ projectRef, apiUrl });

  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const orgIdsByEmail = new Map();
  let apexUserId = null;
  let apexOrgId = null;
  let apexTeamId = null;

  for (const persona of personas) {
    log(`Ensuring auth user ${persona.email}`);
    const userId = await ensureAuthUser(admin, persona);
    // Trigger creates profile + personal org asynchronously enough that a short
    // retry helps on brand-new branches.
    let orgId;
    let lastError;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        orgId = await getOwnerOrgId(admin, userId);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
    }
    if (!orgId) {
      throw lastError || new Error(`Timed out waiting for owner org for ${persona.email}`);
    }

    await upgradeOrg(admin, orgId, persona, userId);
    orgIdsByEmail.set(persona.email, orgId);

    if (persona.seedFleet) {
      apexUserId = userId;
      apexOrgId = orgId;
      log(`Seeding smoke fleet on ${persona.organizationName}`);
      const fleet = await ensureFleet(admin, orgId, userId);
      apexTeamId = fleet.teamId;
    }
  }

  if (apexUserId && apexOrgId) {
    await ensureApexCrossMemberships(admin, apexUserId, orgIdsByEmail);
  }

  try {
    await ensureWorkspaceBranding(admin, {
      apexOrgId,
      apexTeamId,
      metroOrgId: orgIdsByEmail.get('owner@metro.test') ?? null,
    });
  } catch (error) {
    log(`WARN workspace branding seed: ${error.message}`);
  }

  return {
    seededEmails: personas.map((p) => p.email),
    apexOrgId,
  };
}
function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  if (process.argv.includes('--extract-cli-json')) {
    const source = readArg('--extract-cli-json');
    if (!source) {
      console.error(
        'Usage: node seed-quick-login.mjs --extract-cli-json -   (stdin; preferred)',
      );
      console.error(
        '   or: node seed-quick-login.mjs --extract-cli-json <file>',
      );
      process.exit(2);
    }
    const rawText =
      source === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(source, 'utf8');
    const parsed = extractCliJson(rawText);
    process.stdout.write(JSON.stringify(parsed));
    return;
  }

  if (process.argv.includes('--find-branch')) {
    const branchName = readArg('--find-branch');
    const list = JSON.parse(fs.readFileSync(0, 'utf8') || '[]');
    const match = findBranchByName(list, branchName);
    if (!match) process.exit(2);
    process.stdout.write(JSON.stringify(match));
    return;
  }

  const apiUrl = process.env.CLOUD_AGENT_SUPABASE_URL;
  const projectRef = process.env.CLOUD_AGENT_SUPABASE_PROJECT_REF;

  // Fetch service_role inside Node (never expose to bash), seed, print anon only.
  if (process.argv.includes('--fetch-keys-seed-print-anon')) {
    if (!apiUrl || !projectRef || !process.env.SUPABASE_ACCESS_TOKEN) {
      console.error(
        'Usage: set CLOUD_AGENT_SUPABASE_URL, CLOUD_AGENT_SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN then --fetch-keys-seed-print-anon',
      );
      process.exit(2);
    }
    const keys = await fetchProjectApiKeys(
      projectRef,
      process.env.SUPABASE_ACCESS_TOKEN,
    );
    const result = await seedQuickLogin({
      apiUrl,
      serviceRoleKey: keys.serviceRoleKey,
      projectRef,
    });
    log(`Seeded ${result.seededEmails.length} Quick Login personas`);
    if (result.apexOrgId) {
      log(`Primary smoke org id: ${result.apexOrgId}`);
    }
    process.stdout.write(`${formatAnonKeyAssignment(keys.anonKey)}\n`);
    return;
  }

  const serviceRoleKey = process.env.CLOUD_AGENT_SUPABASE_SERVICE_ROLE_KEY;
  if (!apiUrl || !serviceRoleKey || !projectRef) {
    console.error(
      'Usage: set CLOUD_AGENT_SUPABASE_URL, CLOUD_AGENT_SUPABASE_SERVICE_ROLE_KEY, CLOUD_AGENT_SUPABASE_PROJECT_REF — or use --fetch-keys-seed-print-anon',
    );
    process.exit(2);
  }

  const result = await seedQuickLogin({ apiUrl, serviceRoleKey, projectRef });
  log(`Seeded ${result.seededEmails.length} Quick Login personas`);
  if (result.apexOrgId) {
    log(`Primary smoke org id: ${result.apexOrgId}`);
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seed-quick-login.mjs') ||
    process.argv[1].includes('seed-quick-login'));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`  [cloud-seed] FAIL ${error.message}`);
    process.exit(1);
  });
}
