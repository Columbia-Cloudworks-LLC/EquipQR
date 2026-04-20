import { createContext } from 'react';
import type { TeamMembership } from './team-context';

export interface SelectedTeamContextType {
  /** ID of the currently selected team within the active organization, or null if none. */
  selectedTeamId: string | null;
  /** Resolved membership object for selectedTeamId, or null when not present. */
  selectedTeam: TeamMembership | null;
  /** Update the selected team. Pass null to clear the selection. */
  setSelectedTeamId: (teamId: string | null) => void;
}

export const SelectedTeamContext = createContext<SelectedTeamContextType | undefined>(
  undefined
);
