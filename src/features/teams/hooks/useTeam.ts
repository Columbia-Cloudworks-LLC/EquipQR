import { useContext } from 'react';
import { TeamContext } from '@/contexts/TeamContext';

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};