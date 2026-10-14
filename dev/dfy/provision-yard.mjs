#!/usr/bin/env node
/**
 * Done-For-You yard provisioning (issue #1648).
 *
 * Creates an organization with no users, a yard team, its equipment, and
 * email-keyed staged memberships. Staged people claim the yard automatically
 * the first time they sign in with that verified email (Google or magic link).
 * Writes a label-printing CSV and one QR SVG per equipment record.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node dev/dfy/provision-yard.mjs --manifest yard.json \
 *       [--equipment-csv iron.csv] [--app-url https://equipqr.app] \
 *       [--out tmp/dfy/acme] [--send-invites] [--dry-run]
 *
 * See docs/ops/dfy-provisioning.md for the manifest format and runbook.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import {
  buildLabelsCsv,
  equipmentQrUrl,
  parseEquipmentCsv,
  resolveManifest,
  slugify,
} from './manifest.mjs';

const EQUIPMENT_BATCH_SIZE = 500;

function usage(message) {
  if (message) console.error(`provision-yard: ${message}\n`);
  console.error(
    'Usage: node dev/dfy/provision-yard.mjs --manifest <file.json> [--equipment-csv <file.csv>]\n' +
      '         [--app-url <url>] [--out <dir>] [--send-invites] [--dry-run]\n' +
      'Env:   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

/**
 * @template T
 * @param {PromiseLike<{ data: T, error: { message: string } | null }>} query
 * @param {string} step
 * @returns {Promise<T>}
 */
async function checked(query, step) {
  const { data, error } = await query;
  if (error) throw new Error(`${step}: ${error.message}`);
  return data;
}

async function main() {
  const { values } = parseArgs({
    options: {
      manifest: { type: 'string' },
      'equipment-csv': { type: 'string' },
      'app-url': { type: 'string', default: 'https://equipqr.app' },
      out: { type: 'string' },
      'send-invites': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) usage();
  if (!values.manifest) usage('--manifest is required');

  const manifestJson = JSON.parse(fs.readFileSync(values.manifest, 'utf8'));
  const equipmentFromCsv = values['equipment-csv']
    ? parseEquipmentCsv(fs.readFileSync(values['equipment-csv'], 'utf8'))
    : [];
  const plan = resolveManifest(manifestJson, { equipmentFromCsv });

  console.log(`Organization: ${plan.organization.name} (max members ${plan.organization.maxMembers})`);
  console.log(`Team:         ${plan.teamName}`);
  console.log(`Equipment:    ${plan.equipment.length}`);
  for (const s of plan.staff) {
    console.log(`Staff:        ${s.email} → ${s.role}${s.teamRole ? ` (team ${s.teamRole})` : ''}`);
  }

  if (values['dry-run']) {
    console.log('\nDry run: manifest is valid; nothing was written.');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) usage('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const org = await checked(
    client
      .from('organizations')
      .insert({
        name: plan.organization.name,
        plan: 'free',
        member_count: 0,
        max_members: plan.organization.maxMembers,
        provisioned_at: new Date().toISOString(),
      })
      .select('id')
      .single(),
    'Create organization',
  );

  /** @type {Array<{ id: string, name: string, manufacturer: string, model: string, serial_number: string }>} */
  const createdEquipment = [];
  try {
    const team = await checked(
      client.from('teams').insert({ organization_id: org.id, name: plan.teamName }).select('id').single(),
      'Create team',
    );

    for (let i = 0; i < plan.equipment.length; i += EQUIPMENT_BATCH_SIZE) {
      const batch = plan.equipment
        .slice(i, i + EQUIPMENT_BATCH_SIZE)
        .map((row) => ({ ...row, organization_id: org.id, team_id: team.id }));
      const rows = await checked(
        client.from('equipment').insert(batch).select('id, name, manufacturer, model, serial_number'),
        `Insert equipment ${i + 1}-${i + batch.length}`,
      );
      createdEquipment.push(...rows);
    }

    for (const s of plan.staff) {
      await checked(
        client.rpc('stage_provisioned_member', {
          p_organization_id: org.id,
          p_email: s.email,
          p_role: s.role,
          ...(s.teamRole ? { p_team_id: team.id, p_team_role: s.teamRole } : {}),
        }),
        `Stage ${s.email}`,
      );
    }
  } catch (error) {
    // Leave nothing half-provisioned: the org delete cascades to team,
    // equipment, and staged members.
    await client.from('organizations').delete().eq('id', org.id);
    throw error;
  }

  const appUrl = values['app-url'];
  const outDir = values.out ?? path.join('tmp', 'dfy', `${slugify(plan.organization.name)}-${org.id.slice(0, 8)}`);
  fs.mkdirSync(path.join(outDir, 'qr'), { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'labels.csv'),
    buildLabelsCsv(createdEquipment, { appUrl, organizationId: org.id }),
  );
  for (const row of createdEquipment) {
    const svg = await QRCode.toString(equipmentQrUrl(appUrl, row.id, org.id), {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
    });
    fs.writeFileSync(path.join(outDir, 'qr', `${row.id}.svg`), svg);
  }

  const staged = await checked(
    client
      .from('organization_provisioned_members')
      .select('email, role, status')
      .eq('organization_id', org.id)
      .order('created_at'),
    'Read staged members',
  );

  if (values['send-invites']) {
    for (const s of staged.filter((row) => row.status === 'pending')) {
      const { error } = await client.auth.admin.inviteUserByEmail(s.email, { redirectTo: appUrl });
      console.log(error ? `Invite ${s.email}: not sent (${error.message})` : `Invite ${s.email}: sent`);
    }
  }

  console.log(`\nProvisioned organization ${org.id}`);
  for (const s of staged) console.log(`  ${s.email} (${s.role}): ${s.status}`);
  console.log(`Labels: ${path.join(outDir, 'labels.csv')} (${createdEquipment.length} QR codes in ${path.join(outDir, 'qr')})`);
}

main().catch((error) => {
  console.error(`provision-yard: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
