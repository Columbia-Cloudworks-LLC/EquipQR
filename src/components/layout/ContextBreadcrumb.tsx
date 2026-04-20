import React from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ChevronsUpDown, Users as UsersIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import OrganizationSwitcher from '@/features/organization/components/OrganizationSwitcher';
import { useTeam } from '@/features/teams/hooks/useTeam';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useIsMobile } from '@/hooks/use-mobile';
import { getPageLabel, shouldSuppressLabelOnMobile } from './topBarRouteLabels';

/**
 * Persistent global context breadcrumb rendered in the TopBar left slot.
 *
 * Format: `Org > Team > Section`.
 *
 * - **Org**: opens `OrganizationSwitcher` (topbar variant).
 * - **Team**: only renders when the user belongs to ≥1 team. Hidden on mobile.
 *   Selecting a team updates `useSelectedTeam` (persisted per-org in localStorage).
 * - **Section**: derived from the current route via `getPageLabel`. On mobile,
 *   pages that already render a prominent H1 swap this segment for the brand
 *   mark to avoid duplicating the title.
 */
const ContextBreadcrumb: React.FC = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { teamMemberships } = useTeam();
  const { selectedTeamId, selectedTeam, setSelectedTeamId } = useSelectedTeam();

  const sectionLabel = getPageLabel(location.pathname);
  const suppressSectionOnMobile =
    isMobile && shouldSuppressLabelOnMobile(location.pathname);

  const showTeamSegment = !isMobile && teamMemberships.length > 0;
  const teamLabel = selectedTeam?.team_name ?? 'All teams';

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5">
        <BreadcrumbItem className="text-foreground">
          <OrganizationSwitcher variant="topbar" />
        </BreadcrumbItem>

        {showTeamSegment && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Switch team (current: ${teamLabel})`}
                    className="inline-flex items-center gap-1 h-8 px-2 max-w-[10rem] text-muted-foreground hover:text-foreground"
                  >
                    <UsersIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm truncate">{teamLabel}</span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-56">
                  <DropdownMenuLabel className="text-xs">Switch team</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSelectedTeamId(null)}
                    className="text-sm cursor-pointer flex items-center justify-between"
                  >
                    <span>All teams</span>
                    {selectedTeamId === null && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {teamMemberships.map((m) => (
                    <DropdownMenuItem
                      key={m.team_id}
                      onClick={() => setSelectedTeamId(m.team_id)}
                      className="text-sm cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{m.team_name}</span>
                      {selectedTeamId === m.team_id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        {(suppressSectionOnMobile || sectionLabel) && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {suppressSectionOnMobile ? (
                <img
                  src="/icons/EquipQR-Icon-Purple-Small.png"
                  alt="EquipQR"
                  className="h-5 w-5 rounded-sm opacity-90"
                  aria-hidden="true"
                />
              ) : (
                <BreadcrumbPage className="text-sm sm:text-base font-medium truncate max-w-[12rem] sm:max-w-none">
                  {sectionLabel}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default ContextBreadcrumb;
