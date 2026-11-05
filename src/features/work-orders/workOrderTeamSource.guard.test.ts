/**
 * Guard: work orders do not have a team of their own.
 *
 * Equipment belongs to a team; a work order's team is always its equipment's
 * team (`equipment.team_id` via `work_orders.equipment_id`). The old
 * denormalized `work_orders.team_id` column was removed in migration
 * 20261105043341_remove_work_orders_team_id.sql because it drifted from the
 * equipment team and kept attracting new code. These checks fail if it comes back.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const REMOVAL_MIGRATION = '20261105043341_remove_work_orders_team_id.sql';

function tableTypeBlock(types: string, table: string): string {
  const start = types.indexOf(`      ${table}: {\n        Row: {`);
  expect(start, `generated types should contain the ${table} table`).toBeGreaterThan(-1);
  const end = types.indexOf('\n        Relationships:', start);
  return types.slice(start, end);
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('work orders have no team column of their own', () => {
  it('generated Supabase types have no work_orders.team_id', () => {
    const types = readFileSync(join(ROOT, 'src/integrations/supabase/types.ts'), 'utf8');
    const block = tableTypeBlock(types, 'work_orders');
    expect(block).not.toMatch(/\bteam_id\b/);
  });

  it('no migration after the removal re-adds work_orders.team_id', () => {
    const dir = join(ROOT, 'supabase/migrations');
    const later = readdirSync(dir).filter((name) => name > REMOVAL_MIGRATION && name.endsWith('.sql'));
    const offenders = later.filter((name) => {
      const sql = readFileSync(join(dir, name), 'utf8');
      return /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?work_orders\b[^;]*\bADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?team_id\b/i.test(sql);
    });
    expect(offenders).toEqual([]);
  });

  it('app and edge code never read or write a work order team_id', () => {
    const files = [
      ...listSourceFiles(join(ROOT, 'src')),
      ...listSourceFiles(join(ROOT, 'supabase/functions')),
    ].filter((file) => !file.endsWith('integrations/supabase/types.ts'));

    // Property access on work-order-shaped variables, e.g. `workOrder.team_id`, `wo?.team_id`.
    const workOrderTeamAccess = /\b(?:workOrder|fetchedWorkOrder|serverWorkOrder|wo|order|queued|mapped)\??\.team_id\b/;

    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => workOrderTeamAccess.test(line))
        .map(({ line, index }) => `${relative(ROOT, file)}:${index + 1}: ${line.trim()}`),
    );

    expect(offenders, "use the equipment's team (equipmentTeamId / equipment.team_id)").toEqual([]);
  });
});
