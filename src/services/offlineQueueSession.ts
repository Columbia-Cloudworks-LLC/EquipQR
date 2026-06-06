import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/** Returns true when an auth session is available for offline sync. */
export async function ensureActiveOfflineSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return true;
  }

  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('Session refresh failed during offline sync', error);
      return false;
    }
    return true;
  } catch {
    logger.error('Session refresh threw during offline sync');
    return false;
  }
}
