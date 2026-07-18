import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  cursedHistoricalOrgId,
  cursedHistoricalWorkOrders,
} from '../../user/shared/seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

/** Durable cursed accepted-first stub (#1279) — primary evidence target. */
export const legacyTimelineEvidenceWorkOrderId = cursedHistoricalWorkOrders.acceptedFirstStub.id;

const cursedOwnerUserId = 'bb0e8400-e29b-41d4-a716-446655440011';
const cursedEquipmentId = 'aa0e8400-e29b-41d4-a716-446655440c01';
const cursedTeamId = '880e8400-e29b-41d4-a716-446655440011';

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
      // Fall through to explicit env when local stack status is unavailable.
    }
  }

  throw new Error(
    'Cursed timeline evidence seed requires a running local Supabase stack (`npx supabase status -o json`).',
  );
}

function createE2EAdminClient(): SupabaseClient {
  return createClient(LOCAL_SUPABASE_URL, resolveLocalServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Re-applies the durable cursed accepted-first stub shape after prior evidence
 * runs may have saved a repaired timeline via the editor.
 */
export async function resetLegacyAcceptedTimelineEvidenceFixture(): Promise<void> {
  const admin = createE2EAdminClient();
  const workOrderId = legacyTimelineEvidenceWorkOrderId;

  const [{ data: team, error: teamError }, { data: equipment, error: equipmentError }] = await Promise.all([
    admin.from('teams').select('id').eq('id', cursedTeamId).maybeSingle(),
    admin.from('equipment').select('id').eq('id', cursedEquipmentId).maybeSingle(),
  ]);
  if (teamError || equipmentError || !team || !equipment) {
    const details = [teamError?.message, equipmentError?.message].filter(Boolean).join('; ');
    throw new Error(
      `Missing cursed fixture prerequisites (team/equipment). Run npx supabase db reset to apply seeds including 31_cursed_historical_timeline.sql.${details ? ` ${details}` : ''}`,
    );
  }

  const { error: historyDeleteError } = await admin
    .from('work_order_status_history')
    .delete()
    .eq('work_order_id', workOrderId);
  if (historyDeleteError) {
    throw new Error(`Cursed timeline evidence reset: history delete failed — ${historyDeleteError.message}`);
  }

  const { error: workOrderDeleteError } = await admin
    .from('work_orders')
    .delete()
    .eq('id', workOrderId);
  if (workOrderDeleteError) {
    throw new Error(`Cursed timeline evidence reset: work order delete failed — ${workOrderDeleteError.message}`);
  }

  const historicalStartDate = '2026-03-24T13:00:00.000Z';
  const title = cursedHistoricalWorkOrders.acceptedFirstStub.title;

  const { error: workOrderInsertError } = await admin.from('work_orders').insert({
    id: workOrderId,
    organization_id: cursedHistoricalOrgId,
    equipment_id: cursedEquipmentId,
    title,
    description: 'Anonymized legacy historical create: first history row accepted only.',
    status: 'accepted',
    priority: 'medium',
    team_id: cursedTeamId,
    created_by: cursedOwnerUserId,
    created_by_name: 'Casey Cursed',
    created_date: historicalStartDate,
    is_historical: true,
    historical_start_date: historicalStartDate,
    has_pm: false,
  });
  if (workOrderInsertError) {
    throw new Error(`Cursed timeline evidence seed: work order insert failed — ${workOrderInsertError.message}`);
  }

  const { error: historyInsertError } = await admin.from('work_order_status_history').insert({
    id: 'b10e8400-e29b-41d4-a716-446655440c01',
    work_order_id: workOrderId,
    old_status: null,
    new_status: 'accepted',
    changed_by: cursedOwnerUserId,
    changed_at: historicalStartDate,
    reason: 'Historical work order created',
    is_historical_creation: true,
    metadata: { fixture: 'cursed_historical_c01', issue: 1279 },
    changed_by_name: 'Casey Cursed',
  });
  if (historyInsertError) {
    throw new Error(`Cursed timeline evidence seed: history insert failed — ${historyInsertError.message}`);
  }
}
