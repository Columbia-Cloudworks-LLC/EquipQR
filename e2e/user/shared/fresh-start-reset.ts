import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { freshStartOrgId } from './seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

function resolveLocalServiceRoleKey(): string {
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }

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
      return key;
    }
  } catch {
    // Fall through to explicit error below.
  }

  throw new Error(
    'Fresh Start reset requires SUPABASE_SERVICE_ROLE_KEY or a running local Supabase stack (`npx supabase status -o json`).',
  );
}

/**
 * Resets the Fresh Start E2E org to wizard-ready state (no teams/equipment, onboarding incomplete).
 * Safe to call before each onboarding evidence capture; uses service role against local Supabase.
 */
export async function resetFreshStartOnboardingFixture(): Promise<void> {
  const admin = createClient(LOCAL_SUPABASE_URL, resolveLocalServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: equipmentError } = await admin
    .from('equipment')
    .delete()
    .eq('organization_id', freshStartOrgId);
  if (equipmentError) {
    throw new Error(`Fresh Start reset: equipment delete failed — ${equipmentError.message}`);
  }

  const { data: teams, error: teamsQueryError } = await admin
    .from('teams')
    .select('id')
    .eq('organization_id', freshStartOrgId);
  if (teamsQueryError) {
    throw new Error(`Fresh Start reset: teams query failed — ${teamsQueryError.message}`);
  }

  const teamIds = (teams ?? []).map((team) => team.id);
  if (teamIds.length > 0) {
    const { error: teamMembersError } = await admin
      .from('team_members')
      .delete()
      .in('team_id', teamIds);
    if (teamMembersError) {
      throw new Error(`Fresh Start reset: team_members delete failed — ${teamMembersError.message}`);
    }

    const { error: teamsDeleteError } = await admin.from('teams').delete().in('id', teamIds);
    if (teamsDeleteError) {
      throw new Error(`Fresh Start reset: teams delete failed — ${teamsDeleteError.message}`);
    }
  }

  const { error: onboardingError } = await admin
    .from('organization_members')
    .update({ product_onboarding_completed_at: null })
    .eq('organization_id', freshStartOrgId);
  if (onboardingError) {
    throw new Error(`Fresh Start reset: onboarding flag clear failed — ${onboardingError.message}`);
  }
}

const PARTIAL_SETUP_TEAM_ID = '880e8400-e29b-41d4-a716-446655440099';

/**
 * Resets Fresh Start to partial onboarding state: one team, no equipment, onboarding incomplete.
 */
export async function seedFreshStartOneTeamOnly(): Promise<void> {
  await resetFreshStartOnboardingFixture();

  const admin = createClient(LOCAL_SUPABASE_URL, resolveLocalServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: teamError } = await admin.from('teams').insert({
    id: PARTIAL_SETUP_TEAM_ID,
    organization_id: freshStartOrgId,
    name: 'Partial Setup Crew',
    description: 'E2E partial onboarding fixture (team only)',
  });
  if (teamError) {
    throw new Error(`Fresh Start partial setup: team insert failed — ${teamError.message}`);
  }
}
