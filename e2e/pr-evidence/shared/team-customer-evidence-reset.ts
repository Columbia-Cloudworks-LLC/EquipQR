import { execSync } from 'node:child_process';
import { apexOrgId, seedTeams } from '../../user/shared/seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url.includes('://') ? url : `http://${url}`);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

function assertLocalEvidenceTarget(): void {
  if (!isLocalSupabaseUrl(LOCAL_SUPABASE_URL)) {
    throw new Error(
      `Team customer evidence reset only runs against local Supabase (got ${LOCAL_SUPABASE_URL}).`,
    );
  }
}

function runLocalSql(statements: string[]): void {
  assertLocalEvidenceTarget();

  for (const statement of statements) {
    try {
      execSync(`npx supabase db query --local ${JSON.stringify(statement)}`, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Team customer evidence reset requires a running local Supabase stack (npx supabase db query --local). ${message}`,
      );
    }
  }
}

/** Clears Heavy Equipment team customer link so PR evidence can exercise link-existing flow. */
export async function resetApexHeavyEquipmentCustomerLink(): Promise<void> {
  const teamId = seedTeams.apexHeavyEquipment.id;
  runLocalSql([
    `UPDATE teams SET customer_id = NULL WHERE id = '${teamId}';`,
    `DELETE FROM quickbooks_team_customers WHERE organization_id = '${apexOrgId}' AND team_id = '${teamId}';`,
  ]);
}
