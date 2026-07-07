import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { apexOrgId } from '../../user/shared/seed-data';

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
      `Operator check-in evidence reset only runs against local Supabase (got ${LOCAL_SUPABASE_URL}).`,
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
        `Operator check-in evidence reset requires a running local Supabase stack (npx supabase db query --local). ${message}`,
      );
    }
  }
}

let cachedLocalAnonKey: string | null = null;

function resolveLocalAnonKey(): string {
  if (cachedLocalAnonKey) {
    return cachedLocalAnonKey;
  }

  if (isLocalSupabaseUrl(LOCAL_SUPABASE_URL)) {
    try {
      const statusJson = execSync('npx supabase status -o json', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const status = JSON.parse(statusJson) as {
        ANON_KEY?: string;
        anon_key?: string;
      };
      const key = status.ANON_KEY ?? status.anon_key;
      if (key) {
        cachedLocalAnonKey = key;
        return key;
      }
    } catch {
      // Fall through when local stack status is unavailable.
    }
  }

  throw new Error(
    'Operator check-in evidence reset requires a running local Supabase stack (`npx supabase status -o json`).',
  );
}

function createEvidenceAnonClient() {
  return createClient(LOCAL_SUPABASE_URL, resolveLocalAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Clears Apex org operator check-in rows so PR evidence starts from a clean slate. */
export async function resetApexOperatorCheckinEvidence(): Promise<void> {
  runLocalSql([
    `DELETE FROM operator_checkin_submissions WHERE organization_id = '${apexOrgId}';`,
    `DELETE FROM equipment_operator_checkin_settings WHERE organization_id = '${apexOrgId}';`,
    `DELETE FROM operator_checklist_templates WHERE organization_id = '${apexOrgId}';`,
  ]);
}

/**
 * Deletes persisted raw-token secrets for the Apex org while keeping the
 * assignments. Reproduces the pre-#1154 legacy state behind issue #1179:
 * an enabled assignment whose printable QR link is unrecoverable.
 */
export async function clearApexOperatorCheckinTokenSecrets(): Promise<void> {
  runLocalSql([
    `DELETE FROM operator_checkin_token_secrets WHERE organization_id = '${apexOrgId}';`,
  ]);
}

function hashOperatorCheckinToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Confirms the extracted QR token resolves through the public anon RPC. */
export async function assertEvidenceOperatorCheckinTokenRegistered(rawToken: string): Promise<void> {
  const anon = createEvidenceAnonClient();
  const tokenHash = hashOperatorCheckinToken(rawToken);
  const { data: resolved, error: resolveError } = await anon.rpc('resolve_operator_checkin_by_token', {
    p_token_hash: tokenHash,
  });
  if (resolveError) {
    throw new Error(`Evidence anon resolve_operator_checkin_by_token failed — ${resolveError.message}`);
  }
  if (!resolved) {
    throw new Error('Evidence anon resolve_operator_checkin_by_token returned null for registered token hash');
  }
}
