#!/usr/bin/env tsx
/**
 * EquipQR local seed-data generator (#1164).
 *
 * Emits deterministic volume seed SQL into supabase/seeds/generated/
 * (gitignored). `supabase db reset` applies these files after the committed
 * durable-core seeds in supabase/seeds/, via config.toml [db.seed] sql_paths.
 *
 * Usage:
 *   npm run seed:generate                # scale 1 (default dev volume)
 *   npm run seed:generate -- --scale 5   # 5x volume for load testing
 *
 * Wired into:
 *   - dev-start.ps1 -Force (before `supabase db reset`)
 *   - scripts/run-user-regression.ps1 -ResetDb
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateEquipmentDomain } from './generators/equipment';
import { generateInventoryDomain } from './generators/inventory';
import { generateOperatorCheckinDomain } from './generators/operator-checkins';
import { generatePartsRbacDomain } from './generators/parts-rbac';
import { generateWorkOrderDomain } from './generators/work-orders';

const DEFAULT_OUT_DIR = 'supabase/seeds/generated';
const MAX_SCALE = 100;

export interface GeneratedSeedFile {
  fileName: string;
  sql: string;
}

export interface GenerateSeedsResult {
  files: GeneratedSeedFile[];
  summary: Record<string, number>;
}

/** Pure generation — no filesystem access — so tests can assert determinism. */
export function generateSeedFiles(scale: number): GenerateSeedsResult {
  if (!Number.isInteger(scale) || scale < 1 || scale > MAX_SCALE) {
    throw new Error(`--scale must be an integer between 1 and ${MAX_SCALE} (got ${scale})`);
  }

  const equipment = generateEquipmentDomain(scale);
  const inventory = generateInventoryDomain(scale);
  const workOrders = generateWorkOrderDomain(scale, equipment.equipment, inventory.items);
  const partsRbac = generatePartsRbacDomain();
  const operatorCheckins = generateOperatorCheckinDomain(scale, equipment.equipment);

  return {
    files: [
      { fileName: '50_generated_equipment.sql', sql: equipment.sql },
      { fileName: '51_generated_inventory.sql', sql: inventory.sql },
      { fileName: '52_generated_work_orders.sql', sql: workOrders.sql },
      { fileName: '53_generated_parts_rbac.sql', sql: partsRbac.sql },
      { fileName: '54_generated_operator_checkins.sql', sql: operatorCheckins.sql },
    ],
    summary: {
      scale,
      ...prefixKeys('equipment', equipment.summary),
      ...prefixKeys('inventory', inventory.summary),
      ...prefixKeys('workOrders', workOrders.summary),
      ...prefixKeys('partsRbac', partsRbac.summary),
      ...prefixKeys('operatorCheckins', operatorCheckins.summary),
    },
  };
}

function prefixKeys(prefix: string, record: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    out[`${prefix}.${key}`] = value;
  }
  return out;
}

function parseArgs(argv: string[]): { scale: number; outDir: string; help: boolean } {
  let scale = 1;
  let outDir = DEFAULT_OUT_DIR;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--scale') {
      scale = Number(argv[++i]);
    } else if (arg.startsWith('--scale=')) {
      scale = Number(arg.slice('--scale='.length));
    } else if (arg === '--out') {
      outDir = argv[++i];
    } else if (arg.startsWith('--out=')) {
      outDir = arg.slice('--out='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { scale, outDir, help };
}

function main(): void {
  const { scale, outDir, help } = parseArgs(process.argv.slice(2));

  if (help) {
    console.log(`
EquipQR seed-data generator (#1164)

Usage:
  npx tsx scripts/seed-data/generate-seeds.ts [--scale N] [--out DIR]

Options:
  --scale N   Volume multiplier, integer 1-${MAX_SCALE} (default 1).
  --out DIR   Output directory (default ${DEFAULT_OUT_DIR}).
  --help, -h  Show this help.

Output files are applied by 'supabase db reset' after the committed seeds
(see supabase/config.toml [db.seed].sql_paths). Do not commit them.
`);
    return;
  }

  const { files, summary } = generateSeedFiles(scale);
  const absoluteOut = resolve(process.cwd(), outDir);
  mkdirSync(absoluteOut, { recursive: true });

  // Remove stale generated SQL so renamed/removed domains never linger.
  for (const existing of readdirSync(absoluteOut)) {
    if (existing.endsWith('.sql')) {
      rmSync(join(absoluteOut, existing));
    }
  }

  for (const file of files) {
    writeFileSync(join(absoluteOut, file.fileName), `${file.sql}\n`, 'utf8');
  }

  console.log(`Generated ${files.length} seed file(s) at scale ${scale} -> ${outDir}`);
  for (const [key, value] of Object.entries(summary)) {
    if (key === 'scale') continue;
    console.log(`  ${key}: ${value}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
