import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeam } from '@/features/teams/hooks/useTeam';
import { logger } from '@/utils/logger';
import {
  SelectedTeamContext,
  UNASSIGNED_TEAM_ID,
  type SelectedTeamContextType,
  type SelectedTeamId,
} from './selected-team-context';

const STORAGE_KEY_PREFIX = 'equipqr:selectedTeamId:';

const storageKeyFor = (organizationId: string | null) =>
  organizationId ? `${STORAGE_KEY_PREFIX}${organizationId}` : null;

const readStoredTeamId = (organizationId: string | null): SelectedTeamId => {
  const key = storageKeyFor(organizationId);
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    logger.warn('SelectedTeamProvider: failed to read selected team from storage', error);
    return null;
  }
};

const writeStoredTeamId = (organizationId: string | null, teamId: SelectedTeamId): void => {
  const key = storageKeyFor(organizationId);
  if (!key) return;
  try {
    if (teamId) {
      localStorage.setItem(key, teamId);
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    logger.warn('SelectedTeamProvider: failed to persist selected team to storage', error);
  }
};

export const SelectedTeamProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { organizationId } = useOrganization();
  const { teamMemberships, isLoading: teamMembershipsLoading } = useTeam();

  const [selectedTeamId, setSelectedTeamIdState] = useState<SelectedTeamId>(null);

  // Re-hydrate when the active organization changes.
  useEffect(() => {
    setSelectedTeamIdState(readStoredTeamId(organizationId));
  }, [organizationId]);

  // Auto-clear when the selected team is no longer in the user's memberships
  // for the active organization (e.g. removed from the team, or org switched
  // and the team isn't visible in the new org).
  //
  // CRITICAL: gate this on `teamMembershipsLoading`. While the session is still
  // loading, `teamMemberships` is `[]`, which would otherwise cause every
  // initial mount and every org switch to clobber a valid persisted selection
  // before the real membership list arrives.
  //
  // The `UNASSIGNED_TEAM_ID` sentinel is preserved unconditionally — it does
  // not correspond to any membership row, so the membership-visibility check
  // does not apply to it.
  useEffect(() => {
    if (teamMembershipsLoading) return;
    if (!selectedTeamId) return;
    if (selectedTeamId === UNASSIGNED_TEAM_ID) return;
    const stillVisible = teamMemberships.some((m) => m.team_id === selectedTeamId);
    if (!stillVisible) {
      setSelectedTeamIdState(null);
      writeStoredTeamId(organizationId, null);
    }
  }, [selectedTeamId, teamMemberships, teamMembershipsLoading, organizationId]);

  const setSelectedTeamId = useCallback(
    (teamId: SelectedTeamId) => {
      setSelectedTeamIdState(teamId);
      writeStoredTeamId(organizationId, teamId);
    },
    [organizationId]
  );

  const selectedTeam = useMemo(
    () =>
      selectedTeamId && selectedTeamId !== UNASSIGNED_TEAM_ID
        ? teamMemberships.find((m) => m.team_id === selectedTeamId) ?? null
        : null,
    [selectedTeamId, teamMemberships]
  );

  const value = useMemo<SelectedTeamContextType>(
    () => ({ selectedTeamId, selectedTeam, setSelectedTeamId }),
    [selectedTeamId, selectedTeam, setSelectedTeamId]
  );

  return (
    <SelectedTeamContext.Provider value={value}>
      {children}
    </SelectedTeamContext.Provider>
  );
};

export { SelectedTeamContext };
export type { SelectedTeamContextType };
