import { Briefcase, Building2, Check, Handshake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  TEAM_VIEWS,
  TEAM_VIEW_DESCRIPTIONS,
  TEAM_VIEW_LABELS,
  isTeamView,
  type TeamView,
} from '@/features/teams/types/team';

const VIEW_ICONS: Record<TeamView, LucideIcon> = {
  internal: Briefcase,
  department: Building2,
  customer: Handshake,
};

interface TeamViewSwitcherProps {
  activeView: TeamView;
  preferredView: TeamView;
  canSetPreferred: boolean;
  isSavingPreferred: boolean;
  onViewChange: (view: TeamView) => void;
  onSetPreferred: (view: TeamView) => void;
}

/**
 * Switcher for the dedicated team detail views (issue #1132). Anyone can
 * flip views for their session; team managers can persist the active view as
 * the team-wide default that everyone lands on.
 */
export function TeamViewSwitcher({
  activeView,
  preferredView,
  canSetPreferred,
  isSavingPreferred,
  onViewChange,
  onSetPreferred,
}: TeamViewSwitcherProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          type="single"
          variant="outline"
          value={activeView}
          onValueChange={(value) => {
            if (isTeamView(value)) onViewChange(value);
          }}
          aria-label="Team view"
          className="justify-start"
        >
          {TEAM_VIEWS.map((view) => {
            const Icon = VIEW_ICONS[view];
            return (
              <ToggleGroupItem key={view} value={view} aria-label={`${TEAM_VIEW_LABELS[view]} view`}>
                <Icon className="mr-1.5 h-4 w-4" aria-hidden />
                {TEAM_VIEW_LABELS[view]}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        {canSetPreferred && activeView !== preferredView && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSavingPreferred}
            onClick={() => onSetPreferred(activeView)}
          >
            <Check className="mr-1.5 h-4 w-4" aria-hidden />
            {isSavingPreferred ? 'Saving…' : 'Set as team default'}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{TEAM_VIEW_DESCRIPTIONS[activeView]}</p>
    </div>
  );
}
