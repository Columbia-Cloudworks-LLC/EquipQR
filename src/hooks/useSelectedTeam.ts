import { useContext } from 'react';
import { SelectedTeamContext } from '@/contexts/selected-team-context';

export const useSelectedTeam = () => {
  const ctx = useContext(SelectedTeamContext);
  if (ctx === undefined) {
    throw new Error('useSelectedTeam must be used within a SelectedTeamProvider');
  }
  return ctx;
};

export default useSelectedTeam;
