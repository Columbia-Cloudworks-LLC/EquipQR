import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, ChevronRight, Bell, Mail, Smartphone, Moon, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { timezoneOptions } from '@/types/settings';
import {
  useUserTeamsForNotifications,
  useOrgNotificationPreferences,
  useUpsertOrgNotificationPreferences,
  getDefaultNotificationPreferences,
  getBrowserDefaultTimezone,
  type UserTeamForNotifications,
  type UserOrgNotificationPreferencesDocument,
  type NotificationDigestMode,
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
  enabled: boolean;
  statuses: string[];
  onTeamChange: (teamId: string, enabled: boolean, statuses: string[]) => void;
}

const TeamNotificationSetting: React.FC<TeamNotificationSettingProps> = ({
  team,
  enabled,
  statuses,
  onTeamChange,
}) => {
  const handleEnabledChange = (nextEnabled: boolean) => {
    onTeamChange(team.team_id, nextEnabled, statuses);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const nextStatuses = checked
      ? Array.from(new Set([...statuses, status]))
      : statuses.filter((s) => s !== status);
    onTeamChange(team.team_id, enabled, nextStatuses);
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-medium">{team.team_name}</CardTitle>
              <CardDescription className="text-xs">
                {team.organization_name} &bull; {team.user_role}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={handleEnabledChange}
              aria-label={`Enable notifications for ${team.team_name}`}
            />
          </div>
        </div>
      </CardHeader>

      {enabled && (
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
                    checked={statuses.includes(status.value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(status.value, checked === true)
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

interface OrgNotificationPreferencesSectionProps {
  organizationId: string;
  organizationName: string;
  teams: UserTeamForNotifications[];
  preferences: UserOrgNotificationPreferencesDocument;
  onSavePreferences: (
    organizationId: string,
    nextPreferences: UserOrgNotificationPreferencesDocument,
  ) => void;
}

const OrgNotificationPreferencesSection: React.FC<OrgNotificationPreferencesSectionProps> = ({
  organizationId,
  organizationName,
  teams,
  preferences,
  onSavePreferences,
}) => {
  const browserTimezone = useMemo(() => getBrowserDefaultTimezone(), []);

  const availableTimezones = useMemo(() => {
    const currentTz = preferences.quiet_hours.timezone || browserTimezone;
    const exists = timezoneOptions.some((opt) => opt.value === currentTz);
    if (exists) {
      return timezoneOptions;
    }
    return [{ value: currentTz, label: currentTz }, ...timezoneOptions];
  }, [preferences.quiet_hours.timezone, browserTimezone]);

  const handleChannelToggle = (
    channel: keyof UserOrgNotificationPreferencesDocument['channels'],
    checked: boolean,
  ) => {
    onSavePreferences(organizationId, {
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: checked,
      },
    });
  };

  const handleHighPriorityToggle = (checked: boolean) => {
    onSavePreferences(organizationId, {
      ...preferences,
      high_priority_only: checked,
    });
  };

  const handleDigestModeChange = (mode: NotificationDigestMode) => {
    onSavePreferences(organizationId, {
      ...preferences,
      digest: { mode },
    });
  };

  const handleQuietHoursChange = (
    patch: Partial<UserOrgNotificationPreferencesDocument['quiet_hours']>,
  ) => {
    onSavePreferences(organizationId, {
      ...preferences,
      quiet_hours: {
        ...preferences.quiet_hours,
        ...patch,
      },
    });
  };

  const handleTeamChange = (teamId: string, enabled: boolean, statuses: string[]) => {
    onSavePreferences(organizationId, {
      ...preferences,
      teams: {
        ...preferences.teams,
        [teamId]: {
          enabled,
          statuses,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
        {organizationName}
      </h3>

      {/* Channels, Priority, Digest & Quiet Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Delivery Channels &amp; Routing
          </CardTitle>
          <CardDescription className="text-xs">
            Choose how {organizationName} work order updates reach you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor={`${organizationId}-channel-in-app`}
                    className="text-sm font-medium"
                  >
                    In-App
                  </Label>
                  <p className="text-xs text-muted-foreground">Notification center</p>
                </div>
              </div>
              <Switch
                id={`${organizationId}-channel-in-app`}
                checked={preferences.channels.in_app}
                onCheckedChange={(checked) => handleChannelToggle('in_app', checked)}
                aria-label={`Enable in-app notifications for ${organizationName}`}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor={`${organizationId}-channel-email`}
                    className="text-sm font-medium"
                  >
                    Email
                  </Label>
                  <p className="text-xs text-muted-foreground">Work order emails</p>
                </div>
              </div>
              <Switch
                id={`${organizationId}-channel-email`}
                checked={preferences.channels.email}
                onCheckedChange={(checked) => handleChannelToggle('email', checked)}
                aria-label={`Enable email notifications for ${organizationName}`}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor={`${organizationId}-channel-web-push`}
                    className="text-sm font-medium"
                  >
                    Web Push
                  </Label>
                  <p className="text-xs text-muted-foreground">Browser &amp; device push</p>
                </div>
              </div>
              <Switch
                id={`${organizationId}-channel-web-push`}
                checked={preferences.channels.web_push}
                onCheckedChange={(checked) => handleChannelToggle('web_push', checked)}
                aria-label={`Enable web push notifications for ${organizationName}`}
              />
            </div>
          </div>

          {/* Priority Filter & Digest Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label
                    htmlFor={`${organizationId}-high-priority-only`}
                    className="text-sm font-medium"
                  >
                    High-priority only
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only notify when a work order&apos;s priority is High
                </p>
              </div>
              <Switch
                id={`${organizationId}-high-priority-only`}
                checked={preferences.high_priority_only}
                onCheckedChange={handleHighPriorityToggle}
                aria-label={`High-priority notifications only for ${organizationName}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`${organizationId}-digest-mode`}
                className="text-sm font-medium"
              >
                Delivery cadence
              </Label>
              <Select
                value={preferences.digest.mode}
                onValueChange={(val: string) =>
                  handleDigestModeChange(val === 'daily' ? 'daily' : 'realtime')
                }
              >
                <SelectTrigger
                  id={`${organizationId}-digest-mode`}
                  aria-label={`Delivery cadence for ${organizationName}`}
                >
                  <SelectValue placeholder="Select delivery mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (immediate)</SelectItem>
                  <SelectItem value="daily">
                    Daily digest (high priority still immediate)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label
                    htmlFor={`${organizationId}-quiet-hours-enabled`}
                    className="text-sm font-medium"
                  >
                    Quiet hours
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suppress non-high-priority email and push alerts during off-hours (in-app is never suppressed)
                </p>
              </div>
              <Switch
                id={`${organizationId}-quiet-hours-enabled`}
                checked={preferences.quiet_hours.enabled}
                onCheckedChange={(checked) => handleQuietHoursChange({ enabled: checked })}
                aria-label={`Enable quiet hours for ${organizationName}`}
              />
            </div>

            {preferences.quiet_hours.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label
                    htmlFor={`${organizationId}-quiet-start`}
                    className="text-xs text-muted-foreground"
                  >
                    Start time
                  </Label>
                  <Input
                    id={`${organizationId}-quiet-start`}
                    type="time"
                    value={preferences.quiet_hours.start}
                    onChange={(e) => handleQuietHoursChange({ start: e.target.value })}
                    aria-label={`Quiet hours start time for ${organizationName}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`${organizationId}-quiet-end`}
                    className="text-xs text-muted-foreground"
                  >
                    End time
                  </Label>
                  <Input
                    id={`${organizationId}-quiet-end`}
                    type="time"
                    value={preferences.quiet_hours.end}
                    onChange={(e) => handleQuietHoursChange({ end: e.target.value })}
                    aria-label={`Quiet hours end time for ${organizationName}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`${organizationId}-quiet-timezone`}
                    className="text-xs text-muted-foreground"
                  >
                    Timezone
                  </Label>
                  <Select
                    value={preferences.quiet_hours.timezone}
                    onValueChange={(tz: string) => handleQuietHoursChange({ timezone: tz })}
                  >
                    <SelectTrigger
                      id={`${organizationId}-quiet-timezone`}
                      aria-label={`Quiet hours timezone for ${organizationName}`}
                    >
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-Team Status Matrix */}
      <div className="space-y-3">
        {teams.map((team) => {
          const teamPref = preferences.teams[team.team_id];
          return (
            <TeamNotificationSetting
              key={team.team_id}
              team={team}
              enabled={teamPref?.enabled ?? false}
              statuses={teamPref?.statuses ?? []}
              onTeamChange={handleTeamChange}
            />
          );
        })}
      </div>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  const { data: userTeams = [], isLoading: teamsLoading } = useUserTeamsForNotifications();
  const { data: orgPreferencesMap = {}, isLoading: prefsLoading } =
    useOrgNotificationPreferences();
  const upsertPrefsMutation = useUpsertOrgNotificationPreferences();

  const teamsByOrganization = useMemo(() => {
    const groups: Record<string, UserTeamForNotifications[]> = {};
    userTeams.forEach((team) => {
      if (!groups[team.organization_id]) {
        groups[team.organization_id] = [];
      }
      groups[team.organization_id].push(team);
    });
    return groups;
  }, [userTeams]);

  const enabledTeamsCount = useMemo(() => {
    let count = 0;
    for (const [orgId, teams] of Object.entries(teamsByOrganization)) {
      const orgPrefs = orgPreferencesMap[orgId];
      if (!orgPrefs) continue;
      for (const team of teams) {
        if (orgPrefs.teams[team.team_id]?.enabled) {
          count += 1;
        }
      }
    }
    return count;
  }, [teamsByOrganization, orgPreferencesMap]);

  const handleSavePreferences = async (
    organizationId: string,
    nextPreferences: UserOrgNotificationPreferencesDocument,
  ) => {
    try {
      await upsertPrefsMutation.mutateAsync({
        organizationId,
        preferences: nextPreferences,
      });
    } catch {
      // Error toast is handled in useUpsertOrgNotificationPreferences
    }
  };

  if (teamsLoading || prefsLoading) {
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
        <Badge variant="secondary">
          {enabledTeamsCount} team{enabledTeamsCount !== 1 ? 's' : ''} enabled
        </Badge>
      )}

      {Object.entries(teamsByOrganization).map(([orgId, teams]) => {
        const orgPrefs =
          orgPreferencesMap[orgId] ?? getDefaultNotificationPreferences();
        return (
          <OrgNotificationPreferencesSection
            key={orgId}
            organizationId={orgId}
            organizationName={teams[0]?.organization_name ?? 'Organization'}
            teams={teams}
            preferences={orgPrefs}
            onSavePreferences={handleSavePreferences}
          />
        );
      })}

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
          How notifications work
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 pl-6 border-l-2 border-muted text-xs text-muted-foreground space-y-1">
            <p>You&apos;ll only receive notifications for teams you enable</p>
            <p>Choose which work order status changes trigger notifications</p>
            <p>High-priority work orders bypass quiet hours and daily digest buffering</p>
            <p>Quiet hours suppress non-high-priority email and push alerts while keeping in-app notifications active</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default NotificationSettings;
