import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  useUserTeamsForNotifications,
  useNotificationSettings,
  useUpdateNotificationSettings,
  type UserTeamForNotifications,
  type NotificationSetting
} from '@/hooks/useNotificationSettings';

const WORK_ORDER_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface TeamNotificationSettingProps {
  team: UserTeamForNotifications;
  setting: NotificationSetting | undefined;
  onUpdate: (organizationId: string, teamId: string, enabled: boolean, statuses: string[]) => void;
}

const TeamNotificationSetting: React.FC<TeamNotificationSettingProps> = ({
  team,
  setting,
  onUpdate
}) => {
  const [isEnabled, setIsEnabled] = useState(setting?.enabled || false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(setting?.statuses || []);

  const handleEnabledChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    onUpdate(team.organization_id, team.team_id, enabled, selectedStatuses);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter(s => s !== status);

    setSelectedStatuses(newStatuses);
    onUpdate(team.organization_id, team.team_id, isEnabled, newStatuses);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <div>
              <CardTitle className="text-sm font-medium">{team.team_name}</CardTitle>
              <CardDescription className="text-xs">
                {team.organization_name} &bull; {team.user_role}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleEnabledChange}
              aria-label={`Enable notifications for ${team.team_name}`}
            />
          </div>
        </div>
      </CardHeader>

      {isEnabled && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Notify me when work orders are:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {WORK_ORDER_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${team.team_id}-${status.value}`}
                    checked={selectedStatuses.includes(status.value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(status.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`${team.team_id}-${status.value}`}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {status.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const NotificationSettings: React.FC = () => {
  const { data: userTeams = [], isLoading: teamsLoading } = useUserTeamsForNotifications();
  const { data: notificationSettings = [], isLoading: settingsLoading } = useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();

  const teamsByOrganization = useMemo(() => {
    const groups: Record<string, UserTeamForNotifications[]> = {};
    userTeams.forEach(team => {
      if (!groups[team.organization_id]) {
        groups[team.organization_id] = [];
      }
      groups[team.organization_id].push(team);
    });
    return groups;
  }, [userTeams]);

  const settingsMap = useMemo(() => {
    const map: Record<string, NotificationSetting> = {};
    notificationSettings.forEach(setting => {
      map[`${setting.organization_id}-${setting.team_id}`] = setting;
    });
    return map;
  }, [notificationSettings]);

  const handleUpdateSetting = async (
    organizationId: string,
    teamId: string,
    enabled: boolean,
    statuses: string[]
  ) => {
    try {
      await updateSettingsMutation.mutateAsync({
        organizationId,
        teamId,
        enabled,
        statuses
      });
    } catch (error) {
      console.error('Error updating notification setting:', error);
    }
  };

  const enabledTeamsCount = notificationSettings.filter(s => s.enabled).length;

  if (teamsLoading || settingsLoading) {
    return <div className="h-32 bg-muted animate-pulse rounded" />;
  }

  if (userTeams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>You&apos;re not a member of any teams yet</p>
        <p className="text-sm mt-2">
          Join teams to configure notification preferences
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enabledTeamsCount > 0 && (
        <Badge variant="secondary">{enabledTeamsCount} team{enabledTeamsCount !== 1 ? 's' : ''} enabled</Badge>
      )}

      {Object.entries(teamsByOrganization).map(([orgId, teams]) => (
        <div key={orgId}>
          <h3 className="font-medium text-xs text-muted-foreground mb-3 uppercase tracking-wide">
            {teams[0]?.organization_name}
          </h3>
          <div className="space-y-3">
            {teams.map((team) => (
              <TeamNotificationSetting
                key={team.team_id}
                team={team}
                setting={settingsMap[`${team.organization_id}-${team.team_id}`]}
                onUpdate={handleUpdateSetting}
              />
            ))}
          </div>
        </div>
      ))}

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
          How notifications work
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 pl-6 border-l-2 border-muted text-xs text-muted-foreground space-y-1">
            <p>You&apos;ll only receive notifications for teams you enable</p>
            <p>Choose which work order status changes trigger notifications</p>
            <p>Organization admins and owners can see all teams but can still customize preferences</p>
            <p>Notifications appear in real-time and are kept for 30 days</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default NotificationSettings;
