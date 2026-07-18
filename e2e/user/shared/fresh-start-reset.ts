import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  apexOrgId,
  freshStartOrgId,
  pendingApexInvitationId,
  pendingInviteeUserId,
  seedWorkOrders,
} from './seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

let cachedLocalServiceRoleKey: string | null = null;

const PARTIAL_SETUP_TEAM_ID = '880e8400-e29b-41d4-a716-446655440099';

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
      // Fall through to explicit env when local stack status is unavailable.
    }
  }

  throw new Error(
    'E2E fixture reset requires a running local Supabase stack (`npx supabase status -o json`).',
  );
}

/** Local E2E fixture helper — service role is required to reset seeded org state outside RLS. */
function createE2EAdminClient(): SupabaseClient {
  return createClient(LOCAL_SUPABASE_URL, resolveLocalServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resetFreshStartOnboardingFixtureWithAdmin(admin: SupabaseClient): Promise<void> {
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

async function insertFreshStartPartialTeam(admin: SupabaseClient): Promise<void> {
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

/**
 * Resets the Fresh Start E2E org to wizard-ready state (no teams/equipment, onboarding incomplete).
 * Safe to call before each onboarding evidence capture; uses service role against local Supabase.
 */
export async function resetFreshStartOnboardingFixture(
  options?: { seedOneTeam?: boolean },
): Promise<void> {
  const admin = createE2EAdminClient();
  await resetFreshStartOnboardingFixtureWithAdmin(admin);
  if (options?.seedOneTeam) {
    await insertFreshStartPartialTeam(admin);
  }
}

/**
 * Resets the pending Apex invitation E2E fixture so accept flows are repeatable.
 * Removes invitation-derived Apex membership and restores invitation status to pending.
 */
export async function resetPendingApexInviteFixture(): Promise<void> {
  const admin = createE2EAdminClient();

  const { error: membershipError } = await admin
    .from('organization_members')
    .delete()
    .eq('user_id', pendingInviteeUserId)
    .eq('organization_id', apexOrgId);
  if (membershipError) {
    throw new Error(`Pending invite reset: apex membership delete failed — ${membershipError.message}`);
  }

  const { error: invitationError } = await admin
    .from('organization_invitations')
    .update({
      status: 'pending',
      accepted_at: null,
      accepted_by: null,
      declined_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingApexInvitationId);
  if (invitationError) {
    throw new Error(`Pending invite reset: invitation restore failed — ${invitationError.message}`);
  }
}

/**
 * Resets Fresh Start to partial onboarding state: one team, no equipment, onboarding incomplete.
 */
export async function seedFreshStartOneTeamOnly(): Promise<void> {
  await resetFreshStartOnboardingFixture({ seedOneTeam: true });
}

/**
 * Restores the seeded completed work order so Revert to Accepted evidence is idempotent (#1278).
 */
export async function resetCompletedWorkOrderForRevertEvidence(): Promise<void> {
  const admin = createE2EAdminClient();
  const workOrderId = seedWorkOrders.completed.id;
  const { error: historyError } = await admin
    .from('work_order_status_history')
    .delete()
    .eq('work_order_id', workOrderId)
    .eq('reason', 'Reverted to accepted status by admin');

  if (historyError) {
    throw new Error(`Revert evidence history reset failed for ${workOrderId}: ${historyError.message}`);
  }

  const { data, error } = await admin
    .from('work_orders')
    .update({
      status: 'completed',
      completed_date: '2025-12-18',
      updated_at: '2025-12-18 16:00:00+00',
    })
    .eq('id', workOrderId)
    .select('id');

  if (error) {
    throw new Error(`Revert evidence reset failed for ${workOrderId}: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error(`Revert evidence reset failed: seeded work order ${workOrderId} was not found`);
  }
}
