import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Check,
  ChevronsUpDown,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import WorkspaceAvatar from '@/components/layout/WorkspaceAvatar';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeam } from '@/features/teams/hooks/useTeam';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useSelectedTeamImageUrl } from '@/hooks/useSelectedTeamImageUrl';
import { usePermissions } from '@/hooks/usePermissions';
import {
  UNASSIGNED_TEAM_ID,
  type SelectedTeamId,
} from '@/contexts/selected-team-context';
import { cn } from '@/lib/utils';

const formatRole = (role: string) =>
  role.charAt(0).toUpperCase() + role.slice(1);

interface MobileWorkspaceSwitcherProps {
  showTeamSegment: boolean;
  teamLabel: string;
  onRequestCreateTeam: () => void;
}

/**
 * Mobile-only workspace control for the TopBar.
 *
 * Shows the full organization name (up to two lines) and team filter on a
 * second line, then opens a top sheet with readable org/team pickers.
 */
const MobileWorkspaceSwitcher: React.FC<MobileWorkspaceSwitcherProps> = ({
  showTeamSegment,
  teamLabel,
  onRequestCreateTeam,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { currentOrganization, userOrganizations, switchOrganization, isLoading } =
    useOrganization();
  const { teamMemberships } = useTeam();
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();
  const { data: selectedTeamImageUrl } = useSelectedTeamImageUrl(selectedTeamId);
  const { canCreateTeam } = usePermissions();
  const canCreateTeams = canCreateTeam();

  const handleOrganizationSwitch = (organizationId: string) => {
    if (organizationId === currentOrganization.id) return;
    switchOrganization(organizationId);
    setOpen(false);
    navigate('/dashboard');
  };

  const handleTeamSelect = (teamId: SelectedTeamId) => {
    setSelectedTeamId(teamId);
    setOpen(false);
  };

  if (!currentOrganization || isLoading) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center gap-1 py-1">
        <div className="h-4 w-32 max-w-full rounded bg-muted animate-pulse" />
        {showTeamSegment && (
          <div className="h-3 w-20 max-w-full rounded bg-muted animate-pulse" />
        )}
      </div>
    );
  }

  const workspaceSummary = showTeamSegment
    ? `${currentOrganization.name}, ${teamLabel}`
    : currentOrganization.name;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        aria-label={`Workspace: ${workspaceSummary}. Tap to change organization or team.`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="h-auto w-full min-w-0 flex-col items-center gap-0.5 px-1 py-1 hover:bg-accent/50"
      >
        <span className="inline-flex max-w-full items-center justify-center gap-1.5">
          <WorkspaceAvatar
            kind="organization"
            src={currentOrganization.logo}
            name={currentOrganization.name}
            size="sm"
          />
          {showTeamSegment && (
            <WorkspaceAvatar
              kind="team"
              src={selectedTeamImageUrl}
              name={teamLabel}
              size="sm"
            />
          )}
        </span>
        <span className="w-full text-center text-sm font-medium leading-snug line-clamp-2">
          {currentOrganization.name}
        </span>
        {showTeamSegment && (
          <span className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">{teamLabel}</span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
          </span>
        )}
      </Button>

      <SheetContent side="top" className="max-h-[85vh] rounded-b-xl px-4 pb-8 pt-6">
        <SheetHeader className="text-left">
          <SheetTitle>Workspace</SheetTitle>
          <SheetDescription>
            Choose your organization and team filter for this session.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto">
          <section aria-labelledby="mobile-workspace-org-heading">
            <h3
              id="mobile-workspace-org-heading"
              className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Organization
            </h3>
            <ul className="space-y-1">
              {userOrganizations.map((organization) => {
                const isCurrent = currentOrganization.id === organization.id;
                return (
                  <li key={organization.id}>
                    <button
                      type="button"
                      disabled={organization.userStatus !== 'active'}
                      onClick={() => handleOrganizationSwitch(organization.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        isCurrent ? 'bg-accent' : 'hover:bg-accent/60',
                        organization.userStatus !== 'active' && 'opacity-50',
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary">
                        <Building className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium leading-snug">
                            {organization.name}
                          </span>
                          {isCurrent && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatRole(organization.userRole)}
                          </span>
                          {organization.userStatus !== 'active' && (
                            <Badge variant="outline" className="px-1 py-0 text-[10px]">
                              {organization.userStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {showTeamSegment && (
            <section aria-labelledby="mobile-workspace-team-heading">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3
                  id="mobile-workspace-team-heading"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Team filter
                </h3>
                {canCreateTeams && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Create new team"
                    onClick={() => {
                      setOpen(false);
                      onRequestCreateTeam();
                    }}
                    className="h-7 gap-1 border-success/40 text-success hover:bg-success/10"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    New team
                  </Button>
                )}
              </div>
              <ul className="space-y-1">
                <TeamFilterOption
                  label="All teams"
                  selected={selectedTeamId === null}
                  onSelect={() => handleTeamSelect(null)}
                />
                <TeamFilterOption
                  label="Unassigned"
                  selected={selectedTeamId === UNASSIGNED_TEAM_ID}
                  onSelect={() => handleTeamSelect(UNASSIGNED_TEAM_ID)}
                />
                {teamMemberships.map((membership) => (
                  <TeamFilterOption
                    key={membership.team_id}
                    label={membership.team_name}
                    selected={selectedTeamId === membership.team_id}
                    onSelect={() => handleTeamSelect(membership.team_id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const TeamFilterOption: React.FC<{
  label: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ label, selected, onSelect }) => (
  <li>
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        selected ? 'bg-accent font-medium' : 'hover:bg-accent/60',
      )}
    >
      <span>{label}</span>
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  </li>
);

export default MobileWorkspaceSwitcher;
