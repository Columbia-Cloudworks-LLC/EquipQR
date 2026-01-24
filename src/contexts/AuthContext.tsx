
import React, { createContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Throttle duration for applying pending admin grants.
 * 1 hour = 60 minutes * 60 seconds * 1000 milliseconds
 */
const ADMIN_GRANTS_THROTTLE_MS = 60 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logger.debug('AuthProvider - Setting up auth listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (import.meta.env.DEV) {
          logger.debug('Auth state change', {
            event,
            user: session?.user?.email || 'none',
            timestamp: new Date().toISOString()
          });
        }
        
        // Distinguish between different types of auth events
        const isTokenRefresh = event === 'TOKEN_REFRESHED';
        const isSignIn = event === 'SIGNED_IN';
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Handle post-login redirect for QR code scans (only for actual sign-ins)
        if (isSignIn && session?.user) {
          const pendingRedirect = sessionStorage.getItem('pendingRedirect');
          if (pendingRedirect) {
            sessionStorage.removeItem('pendingRedirect');
            // Redirecting to pending URL after sign-in
            // Use setTimeout to ensure the redirect happens after state updates
            setTimeout(() => {
              window.location.href = pendingRedirect;
            }, 100);
          }

          // Apply pending admin grants for Google-verified users.
          // Note: The handle_new_user trigger also calls this for NEW users, but this
          // client-side call is needed for EXISTING users who may have pending grants
          // that were created after their initial sign-up. The RPC is idempotent.
          // 
          // We use localStorage (not sessionStorage) for cross-window/tab persistence:
          // - localStorage persists across browser windows and restarts
          // - Timestamp check (1 hour) prevents excessive calls while ensuring grants
          //   are eventually applied for users who haven't logged in recently
          // The RPC is lightweight and idempotent, so occasional duplicate calls are acceptable.
          // Note: The cache key only includes user_id (not organization_id) because
          // apply_pending_admin_grants_for_user applies grants for the user across ALL
          // organizations they belong to, so organization context isn't needed.
          const adminGrantsCacheKey = `equipqr_admin_grants_${session.user.id}`;
          const lastAppliedStr = localStorage.getItem(adminGrantsCacheKey);
          const lastAppliedAt = lastAppliedStr ? parseInt(lastAppliedStr, 10) : 0;
          const shouldApplyGrants = Date.now() - lastAppliedAt > ADMIN_GRANTS_THROTTLE_MS;

          if (shouldApplyGrants) {
            supabase.rpc('apply_pending_admin_grants_for_user', {
              p_user_id: session.user.id
            })
              .then(() => {
                // Store timestamp in localStorage to enable time-based throttling across windows
                localStorage.setItem(adminGrantsCacheKey, String(Date.now()));
              })
              .catch((error) => {
                if (import.meta.env.DEV) {
                  logger.warn('Failed to apply pending admin grants', error);
                }
              });
          }
        }

        // Don't trigger session refresh for token refreshes - this is normal
        if (isTokenRefresh) {
          // Token refreshed - maintaining current session state
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (import.meta.env.DEV) {
        logger.debug('Initial session check', {
          user: session?.user?.email || 'none',
          hasSession: !!session
        });
      }
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name || email
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Let Supabase handle all auth storage cleanup
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.warn('Server-side logout failed', error);
        // Continue with cleanup even if server logout fails
      }
    } catch (error) {
      logger.error('Exception during logout', error);
    } finally {
      // Clear application-specific storage
      try {
        sessionStorage.removeItem('pendingRedirect');
        // Clear admin grants cache keys from localStorage (they start with equipqr_admin_grants_)
        Object.keys(localStorage)
          .filter(key => key.startsWith('equipqr_admin_grants_'))
          .forEach(key => localStorage.removeItem(key));
      } catch (storageError) {
        logger.warn('Error clearing storage', storageError);
      }
      
      // Reset local state
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      signUp, 
      signIn, 
      signInWithGoogle,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
