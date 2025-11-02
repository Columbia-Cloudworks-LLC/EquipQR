
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
      // Convert Supabase user to our User interface
      const user: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email || 'User'
      };
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
    
    setIsLoading(false);
  }, [authUser, authLoading]);

  const value: UserContextType = { currentUser, isLoading, setCurrentUser };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
