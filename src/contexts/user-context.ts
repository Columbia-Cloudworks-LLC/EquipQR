import { createContext } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

