
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
      // Fetch profile to get avatar_url and persisted name
      const fetchProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', authUser.id)
          .single();

        const user: User = {
          id: authUser.id,
          email: authUser.email || '',
          name: profile?.name || authUser.user_metadata?.name || authUser.email || 'User',
          avatar_url: profile?.avatar_url ?? null,
        };
        setCurrentUser(user);
        setIsLoading(false);
      };
      fetchProfile();
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
