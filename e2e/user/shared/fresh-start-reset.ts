import { createClient } from '@supabase/supabase-js';
import { freshStartOrgId } from './seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

/** Local Supabase CLI default service role JWT (demo only — not production). */
const LOCAL_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/**
 * Resets the Fresh Start E2E org to wizard-ready state (no teams/equipment, onboarding incomplete).
 * Safe to call before each onboarding evidence capture; uses service role against local Supabase.
 */
export async function resetFreshStartOnboardingFixture(): Promise<void> {
  const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY, {
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
