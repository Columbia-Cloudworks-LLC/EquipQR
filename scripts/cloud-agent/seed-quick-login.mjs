#!/usr/bin/env node
/**
 * Cloud-safe Quick Login seed for ephemeral Supabase branches.
 *
 * Hosted Auth blocks direct auth.users SQL inserts. This script creates the
 * Dev Quick Login personas via Auth Admin API, then upgrades the trigger-created
 * personal org for the primary smoke persona with a team + equipment row.
 *
 * Safety: refuses parent/production project refs and supabase.equipqr.app.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

export const PARENT_PROJECT_REF = 'ymxkzronkhwxzcdcbnwq';

/**
 * Same password contract as DevQuickLogin.tsx / local supabase seeds.
 * Override with CLOUD_AGENT_QUICK_LOGIN_PASSWORD or VITE_DEV_TEST_PASSWORD.
 */
export function resolveDevPassword() {
  return (
    process.env.CLOUD_AGENT_QUICK_LOGIN_PASSWORD ||
    process.env.VITE_DEV_TEST_PASSWORD ||
    'password123'
  );
}

/** Core Dev Quick Login personas (emails/password match DevQuickLogin.tsx). */
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
];

export function assertBranchSafeTarget({ projectRef, apiUrl }) {
  const ref = String(projectRef || '').trim();
  const url = String(apiUrl || '').trim().toLowerCase();

  if (!ref) {
    throw new Error('projectRef is required');
  }
  if (ref === PARENT_PROJECT_REF) {
    throw new Error(
      `Refusing to seed parent/production project ${PARENT_PROJECT_REF}`,
    );
  }
  if (url.includes('supabase.equipqr.app')) {
    throw new Error('Refusing to seed production custom domain supabase.equipqr.app');
  }
  if (!url.includes('supabase.co') && !url.includes('localhost')) {
    // Allow supabase.co branch hosts; localhost only for unit tests.
    throw new Error(`Unexpected API URL for ephemeral seed: ${apiUrl}`);
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

export function formatShellKeyAssignments({ anonKey, serviceRoleKey }) {
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
  return [
    `anon_key=${shellQuote(anonKey)}`,
    `service_role_key=${shellQuote(serviceRoleKey)}`,
  ].join('\n');
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
  console.log(`  [cloud-seed] ${message}`);
}

async function ensureAuthUser(admin, persona) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`);
  }

  const existing = (listed?.users || []).find(
    (user) =>
      user.id === persona.id ||
      String(user.email || '').toLowerCase() === persona.email.toLowerCase(),
  );

  if (existing) {
    const password = resolveDevPassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          name: persona.name,
          organization_name: persona.organizationName,
        },
      },
    );
    if (updateError) {
      throw new Error(`updateUserById(${persona.email}) failed: ${updateError.message}`);
    }
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    id: persona.id,
    email: persona.email,
    password: resolveDevPassword(),
    email_confirm: true,
    user_metadata: {
      name: persona.name,
      organization_name: persona.organizationName,
    },
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

async function upgradeOrg(admin, orgId, persona) {
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
    .eq('user_id', persona.id);

  if (memberError) {
    throw new Error(`organization_members onboarding update failed: ${memberError.message}`);
  }
}

async function ensureFleet(admin, orgId, ownerUserId) {
  const teamId = '880e8400-e29b-41d4-a716-446655440000';
  const equipmentId = 'aa0e8400-e29b-41d4-a716-446655440000';
  const teamMemberId = 'dd0e8400-e29b-41d4-a716-446655440001';

  const { error: teamError } = await admin.from('teams').upsert(
    {
      id: teamId,
      organization_id: orgId,
      name: 'Heavy Equipment Team',
      description: 'Cloud-agent smoke team',
      location_city: 'Dallas',
      location_state: 'TX',
      location_country: 'United States',
      location_lat: 32.776664,
      location_lng: -96.796988,
      override_equipment_location: true,
    },
    { onConflict: 'id' },
  );
  if (teamError) {
    throw new Error(`teams upsert failed: ${teamError.message}`);
  }

  const { error: tmError } = await admin.from('team_members').upsert(
    {
      id: teamMemberId,
      team_id: teamId,
      user_id: ownerUserId,
      role: 'manager',
      joined_date: '2024-01-01T00:00:00.000Z',
    },
    { onConflict: 'id' },
  );
  if (tmError) {
    throw new Error(`team_members upsert failed: ${tmError.message}`);
  }

  const { error: eqError } = await admin.from('equipment').upsert(
    {
      id: equipmentId,
      organization_id: orgId,
      team_id: teamId,
      name: 'CAT 320 Excavator',
      manufacturer: 'Caterpillar',
      model: '320 GC',
      serial_number: 'CAT320GC-CLOUD-AGENT-001',
      status: 'active',
      location: 'Dallas, TX',
      installation_date: '2023-03-15',
      working_hours: 100,
      custom_attributes: {},
    },
    { onConflict: 'id' },
  );
  if (eqError) {
    throw new Error(`equipment upsert failed: ${eqError.message}`);
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

    await upgradeOrg(admin, orgId, persona);
    orgIdsByEmail.set(persona.email, orgId);

    if (persona.seedFleet) {
      apexUserId = userId;
      apexOrgId = orgId;
      log(`Seeding smoke fleet on ${persona.organizationName}`);
      await ensureFleet(admin, orgId, userId);
    }
  }

  if (apexUserId && apexOrgId) {
    await ensureApexCrossMemberships(admin, apexUserId, orgIdsByEmail);
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
    const filePath = readArg('--extract-cli-json');
    if (!filePath) {
      console.error('Usage: node seed-quick-login.mjs --extract-cli-json <file>');
      process.exit(2);
    }
    const parsed = extractCliJson(fs.readFileSync(filePath, 'utf8'));
    process.stdout.write(JSON.stringify(parsed));
    return;
  }

  if (process.argv.includes('--print-keys')) {
    const raw = fs.readFileSync(0, 'utf8');
    const keys = parseProjectApiKeys(JSON.parse(raw || '[]'));
    process.stdout.write(`${formatShellKeyAssignments(keys)}\n`);
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

  const apiUrl = readArg('--api-url') || process.env.CLOUD_AGENT_SUPABASE_URL;
  const serviceRoleKey =
    readArg('--service-role-key') || process.env.CLOUD_AGENT_SUPABASE_SERVICE_ROLE_KEY;
  const projectRef =
    readArg('--project-ref') || process.env.CLOUD_AGENT_SUPABASE_PROJECT_REF;

  if (!apiUrl || !serviceRoleKey || !projectRef) {
    console.error(
      'Usage: node scripts/cloud-agent/seed-quick-login.mjs --api-url <url> --service-role-key <key> --project-ref <ref>',
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
