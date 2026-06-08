import { supabase } from '@/integrations/supabase/client';
import { getAuthClaims } from '@/lib/authClaims';

export async function assertCanManageInvitation(
  organizationId: string,
  invitationId: string,
  actionLabel: 'resend' | 'cancel',
): Promise<{ sub: string }> {
  const claims = await getAuthClaims();
  if (!claims) throw new Error('User not authenticated');

  const { data: canManage } = await supabase.rpc('can_manage_invitation_atomic', {
    user_uuid: claims.sub,
    invitation_id: invitationId,
  });

  if (!canManage) {
    throw new Error(`You do not have permission to ${actionLabel} this invitation`);
  }

  return { sub: claims.sub };
}
