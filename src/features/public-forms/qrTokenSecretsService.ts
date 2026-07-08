/**
 * Shared raw-QR-token access for token-gated public form domains.
 * Raw tokens are minted/rotated by SECURITY DEFINER RPCs and persisted in
 * admin-readable secrets tables so QR links stay printable from any device.
 */

import { supabase } from '@/integrations/supabase/client';

type RotateTokenRpcName = 'rotate_operator_checkin_token' | 'rotate_quick_form_token';

/** Call a rotate-token RPC and return the freshly minted raw token. */
export async function rotateQrTokenViaRpc(
  rpcName: RotateTokenRpcName,
  params: Record<string, string>,
): Promise<string> {
  const { data, error } = await supabase.rpc(rpcName, params as never);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const rawToken = (row as { raw_token?: string } | null)?.raw_token;
  if (!rawToken) {
    throw new Error('Token rotation failed');
  }
  return rawToken;
}

type TokenSecretsTable = 'operator_checkin_token_secrets' | 'quick_form_token_secrets';

/**
 * Read the persisted raw token for one record. RLS restricts reads to org
 * owners/admins; everyone else resolves to null.
 */
export async function getQrTokenSecret(
  table: TokenSecretsTable,
  keyColumn: 'settings_id' | 'quick_form_id',
  keyValue: string,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .select('raw_token')
    .eq(keyColumn as never, keyValue)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return (data as { raw_token?: string } | null)?.raw_token ?? null;
}
