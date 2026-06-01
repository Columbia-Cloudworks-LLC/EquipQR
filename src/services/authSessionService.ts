import { supabase } from '@/integrations/supabase/client';

/**
 * Invalidate the user's session on all devices before local app cleanup.
 * Used after account deletion when global sign-out is required.
 */
export async function signOutGlobally(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    throw error;
  }
}
