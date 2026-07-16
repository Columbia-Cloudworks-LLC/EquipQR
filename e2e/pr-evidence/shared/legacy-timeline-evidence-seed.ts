import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apexOrgId, seedEquipment } from '../../user/shared/seed-data';

const LOCAL_SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';

export const legacyTimelineEvidenceWorkOrderId = 'a00e8400-e29b-41d4-a716-4466554401ea';
const apexOwnerUserId = 'bb0e8400-e29b-41d4-a716-446655440001';

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
    'Legacy timeline evidence seed requires a running local Supabase stack (`npx supabase status -o json`).',
  );
}

function createE2EAdminClient(): SupabaseClient {
  return createClient(LOCAL_SUPABASE_URL, resolveLocalServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function resetLegacyAcceptedTimelineEvidenceFixture(): Promise<void> {
  const admin = createE2EAdminClient();
  const workOrderId = legacyTimelineEvidenceWorkOrderId;

  const { error: historyDeleteError } = await admin
    .from('work_order_status_history')
    .delete()
    .eq('work_order_id', workOrderId);
  if (historyDeleteError) {
    throw new Error(`Legacy timeline evidence reset: history delete failed — ${historyDeleteError.message}`);
  }

  const { error: workOrderDeleteError } = await admin
    .from('work_orders')
    .delete()
    .eq('id', workOrderId);
  if (workOrderDeleteError) {
    throw new Error(`Legacy timeline evidence reset: work order delete failed — ${workOrderDeleteError.message}`);
  }

  const historicalStartDate = '2026-03-24T13:00:00.000Z';
  const title = 'PR Evidence Legacy Accepted Timeline Seed';

  const { error: workOrderInsertError } = await admin.from('work_orders').insert({
    id: workOrderId,
    organization_id: apexOrgId,
    equipment_id: seedEquipment.cat320.id,
    title,
    description: 'Legacy historical create fixture for issue #1276 timeline editor evidence.',
    status: 'accepted',
    priority: 'medium',
    created_by: apexOwnerUserId,
    created_by_name: 'Alex Apex',
    created_date: historicalStartDate,
    is_historical: true,
    historical_start_date: historicalStartDate,
    has_pm: false,
  });
  if (workOrderInsertError) {
    throw new Error(`Legacy timeline evidence seed: work order insert failed — ${workOrderInsertError.message}`);
  }

  const { error: historyInsertError } = await admin.from('work_order_status_history').insert({
    work_order_id: workOrderId,
    old_status: null,
    new_status: 'accepted',
    changed_by: apexOwnerUserId,
    changed_at: historicalStartDate,
    reason: 'Historical work order created',
    is_historical_creation: true,
    metadata: { fixture: 'issue_1276_legacy_accepted_seed' },
  });
  if (historyInsertError) {
    throw new Error(`Legacy timeline evidence seed: history insert failed — ${historyInsertError.message}`);
  }
}
