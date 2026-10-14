#!/usr/bin/env node
/**
 * Done-For-You manifest check (issue #1648).
 *
 * Validates a provisioning manifest (and optional equipment CSV) with the same
 * rules the in-app "Provision a yard" page uses, and prints the plan. It no
 * longer writes anything: provisioning runs in the app for allowlisted
 * operators (dfy-provisioning Edge Function), which records who provisioned
 * the yard and never needs a service-role key on a workstation.
 *
 * Usage:
 *   node dev/dfy/provision-yard.mjs --manifest yard.json [--equipment-csv iron.csv] --dry-run
 *
 * See docs/ops/dfy-provisioning.md.
 */

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { parseEquipmentCsv, resolveManifest } from './manifest.mjs';

function usage(message) {
  if (message) console.error(`provision-yard: ${message}\n`);
  console.error(
    'Usage: node dev/dfy/provision-yard.mjs --manifest <file.json> [--equipment-csv <file.csv>] --dry-run\n' +
      'Provision yards in the app: /dashboard/operator/provision (EquipQR operators only).',
  );
  process.exit(1);
}

function main() {
  const { values } = parseArgs({
    options: {
      manifest: { type: 'string' },
      'equipment-csv': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) usage();
  if (!values.manifest) usage('--manifest is required');
  if (!values['dry-run']) {
    usage('this script only validates manifests now; pass --dry-run');
  }

  const manifestJson = JSON.parse(fs.readFileSync(values.manifest, 'utf8'));
  const equipmentFromCsv = values['equipment-csv']
    ? parseEquipmentCsv(fs.readFileSync(values['equipment-csv'], 'utf8'))
    : [];
  const plan = resolveManifest(manifestJson, { equipmentFromCsv });

  console.log(`Organization: ${plan.organization.name}`);
  console.log(`Team:         ${plan.teamName}`);
  console.log(`Equipment:    ${plan.equipment.length}`);
  for (const s of plan.staff) {
    console.log(`Staff:        ${s.email} → ${s.role}${s.teamRole ? ` (team ${s.teamRole})` : ''}`);
  }
  console.log('\nDry run: manifest is valid; nothing was written.');
}

try {
  main();
} catch (error) {
  console.error(`provision-yard: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
