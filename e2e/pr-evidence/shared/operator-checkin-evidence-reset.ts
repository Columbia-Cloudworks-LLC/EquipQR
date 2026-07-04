import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apexOrgId } from '../../user/shared/seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

let cachedLocalServiceRoleKey: string | null = null;

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url.includes('://') ? url : `http://${url}`);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

function resolveLocalServiceRoleKey(): string {
  if (cachedLocalServiceRoleKey) {
    return cachedLocalServiceRoleKey;
  }

  if (isLocalSupabaseUrl(LOCAL_SUPABASE_URL)) {
    try {
      const statusJson = execSync('npx supabase status -o json', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const status = JSON.parse(statusJson) as {
        SERVICE_ROLE_KEY?: string;
        service_role_key?: string;
      };
      const key = status.SERVICE_ROLE_KEY ?? status.service_role_key;
      if (key) {
        cachedLocalServiceRoleKey = key;
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

function createEvidenceAdminClient(): SupabaseClient {
  return createClient(LOCAL_SUPABASE_URL, resolveLocalServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createEvidenceAnonClient(): SupabaseClient {
  return createClient(LOCAL_SUPABASE_URL, resolveLocalAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Clears Apex org operator check-in rows so PR evidence starts from a clean slate. */
export async function resetApexOperatorCheckinEvidence(): Promise<void> {
  const admin = createEvidenceAdminClient();

  const { error: submissionsError } = await admin
    .from('operator_checkin_submissions')
    .delete()
    .eq('organization_id', apexOrgId);
  if (submissionsError) {
    throw new Error(`Evidence reset: submissions delete failed — ${submissionsError.message}`);
  }

  const { error: settingsError } = await admin
    .from('equipment_operator_checkin_settings')
    .delete()
    .eq('organization_id', apexOrgId);
  if (settingsError) {
    throw new Error(`Evidence reset: settings delete failed — ${settingsError.message}`);
  }

  const { error: templatesError } = await admin
    .from('operator_checklist_templates')
    .delete()
    .eq('organization_id', apexOrgId);
  if (templatesError) {
    throw new Error(`Evidence reset: templates delete failed — ${templatesError.message}`);
  }
}

function hashOperatorCheckinToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Confirms the extracted QR token matches a live Apex assignment row. */
export async function assertEvidenceOperatorCheckinTokenRegistered(rawToken: string): Promise<void> {
  const admin = createEvidenceAdminClient();
  const tokenHash = hashOperatorCheckinToken(rawToken);
  const { data, error } = await admin
    .from('equipment_operator_checkin_settings')
    .select('id, enabled, organization_id')
    .eq('organization_id', apexOrgId)
    .eq('public_token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Evidence token lookup failed — ${error.message}`);
  }
  if (!data?.enabled) {
    throw new Error('Evidence token hash is missing or disabled in equipment_operator_checkin_settings');
  }

  const anon = createEvidenceAnonClient();
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
