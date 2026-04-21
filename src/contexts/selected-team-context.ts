import { createContext } from 'react';
import type { TeamMembership } from './team-context';

/**
 * Sentinel `selectedTeamId` value meaning "show items not assigned to any team".
 *
 * Used app-wide (TopBar breadcrumb, Equipment, Work Orders, Fleet Map) so the
 * three list/map surfaces and the global selector agree on a single literal
 * for the unassigned bucket.
 */
export const UNASSIGNED_TEAM_ID = 'unassigned' as const;

/**
 * Discriminator for the global team scope:
 * - `null` => "All teams" (no scope filter)
 * - `'unassigned'` => items without a team_id
 * - any other string => that team's UUID
 */
export type SelectedTeamId = string | typeof UNASSIGNED_TEAM_ID | null;

export interface SelectedTeamContextType {
  /** Currently selected team scope within the active organization. */
  selectedTeamId: SelectedTeamId;
  /**
   * Resolved membership object for `selectedTeamId`, or `null` when the
   * selection is "All teams" or "Unassigned" (neither maps to a membership).
   */
  selectedTeam: TeamMembership | null;
  /** Update the selected team. Pass `null` to clear (= "All teams"). */
  setSelectedTeamId: (teamId: SelectedTeamId) => void;
}

export const SelectedTeamContext = createContext<SelectedTeamContextType | undefined>(
  undefined
);
