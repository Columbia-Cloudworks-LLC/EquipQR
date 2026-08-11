
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { resolveEffectiveAvatarUrl } from '@/utils/resolveEffectiveAvatarUrl';
import {
  UserContext,
  type User,
  type UserContextType,
} from './user-context';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (authUser) {
      // Track whether this effect is still current to prevent stale updates
      let cancelled = false;

      // Fetch profile to get avatar_url and persisted name
      const fetchProfile = async () => {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', authUser.id)
            .single();

          if (cancelled) return;

          if (error) {
            console.error('Failed to fetch user profile:', error.message);
          }

          const user: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: profile?.name || authUser.user_metadata?.name || authUser.email || 'User',
            // EquipQR upload wins; otherwise Google Auth metadata photo
            avatar_url: resolveEffectiveAvatarUrl(
              profile?.avatar_url,
              authUser.user_metadata,
            ),
          };
          setCurrentUser(user);
        } catch (err) {
          if (cancelled) return;
          console.error('Unexpected error fetching user profile:', err);
          // Fall back to auth-only user so the app isn't stuck loading
          setCurrentUser({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email || 'User',
            avatar_url: resolveEffectiveAvatarUrl(null, authUser.user_metadata),
          });
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };
      fetchProfile();

      return () => {
        cancelled = true;
      };
    } else {
      setCurrentUser(null);
      setIsLoading(false);
    }
  }, [authUser, authLoading]);

  const value: UserContextType = { currentUser, isLoading, setCurrentUser };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
