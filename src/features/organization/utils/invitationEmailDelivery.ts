import { supabase } from '@/integrations/supabase/client';

export type InvitationEmailPayload = {
  invitationId: string;
  email: string;
  role: string;
  message?: string | null;
};

export async function fetchInvitationEmailContext(
  organizationId: string,
  inviterUserId: string,
): Promise<{ organizationName: string; inviterName: string }> {
  const [profileResult, organizationResult] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', inviterUserId).single(),
    supabase.from('organizations').select('name').eq('id', organizationId).single(),
  ]);

  return {
    organizationName: organizationResult.data?.name || 'Your Organization',
    inviterName: profileResult.data?.name || 'Team Member',
  };
}

export async function sendInvitationEmail(
  payload: InvitationEmailPayload,
  context: { organizationName: string; inviterName: string },
): Promise<void> {
  const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
    body: {
      invitationId: payload.invitationId,
      email: payload.email.toLowerCase().trim(),
      role: payload.role,
      organizationName: context.organizationName,
      inviterName: context.inviterName,
      message: payload.message ?? undefined,
    },
  });

  if (emailError) {
    throw emailError;
  }
}
