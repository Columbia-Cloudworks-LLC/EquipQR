import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Users } from 'lucide-react';
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
                {team.organization_name} • {team.user_role}
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

  // Group teams by organization for better display
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

  // Create a map of settings for quick lookup
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
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (userTeams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure when you want to receive notifications for work orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You're not a member of any teams yet</p>
            <p className="text-sm mt-2">
              Join teams to configure notification preferences
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
          {enabledTeamsCount > 0 && (
            <Badge variant="secondary">{enabledTeamsCount} teams enabled</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure when you want to receive notifications for work orders. 
          You can enable notifications for specific teams and choose which status changes to be notified about.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(teamsByOrganization).map(([orgId, teams]) => (
            <div key={orgId}>
              <h3 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wide">
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
          
          <div className="pt-4 border-t">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Settings className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium">How notifications work</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• You'll only receive notifications for teams you enable</li>
                  <li>• Choose which work order status changes trigger notifications</li>
                  <li>• Organization admins and owners can see all teams but can still customize preferences</li>
                  <li>• Notifications appear in real-time and are kept for 7 days</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
