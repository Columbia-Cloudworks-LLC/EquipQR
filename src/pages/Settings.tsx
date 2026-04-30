
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { useSettings } from '@/contexts/useSettings';
import PersonalizationSettings from '@/components/settings/PersonalizationSettings';
import ProfileSettings from '@/components/settings/ProfileSettings';
import { EmailPrivacySettings } from '@/components/settings/EmailPrivacySettings';
import { SensitivePrivacySettings } from '@/components/settings/SensitivePrivacySettings';
import { SecurityStatus } from '@/components/security/SecurityStatus';
import { SessionStatus } from '@/components/session/SessionStatus';
import NotificationSettings from '@/components/settings/NotificationSettings';
import MFASettings from '@/components/settings/MFASettings';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { useAppToast } from '@/hooks/useAppToast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/contexts/useUser';
import Page from '@/components/layout/Page';
import { AlertTriangle, ExternalLink } from 'lucide-react';


const SettingsContent = () => {
  const { resetSettings } = useSettings();
  const { user } = useAuth();
  const { currentUser } = useUser();
  const appToast = useAppToast();

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('email_private, limit_sensitive_pi')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleResetSettings = () => {
    resetSettings();
    appToast.success({ description: 'Settings have been reset to default values' });
  };

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="space-y-6">
      {/* Page header with user identity */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences and application settings.
        </p>
        {currentUser && (
          <div className="flex items-center gap-3 mt-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar_url || undefined} alt={currentUser.name || ''} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{currentUser.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar + content layout */}
      <div className="flex flex-col md:flex-row gap-8">
        <SettingsNav />

        <div className="flex-1 min-w-0 divide-y">
          {/* Profile */}
          <section id="profile" className="pb-8 scroll-mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className="pt-0.5">
                <h2 className="text-sm font-semibold">Profile</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Your display name, avatar, and account email
                </p>
              </div>
              <div className="md:col-span-2 space-y-5">
                <ProfileSettings />
              </div>
            </div>
          </section>

          {/* Personalization */}
          <section id="personalization" className="py-8 scroll-mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className="pt-0.5">
                <h2 className="text-sm font-semibold">Personalization</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Theme, timezone, and date format preferences
                </p>
              </div>
              <div className="md:col-span-2 space-y-5">
                <PersonalizationSettings />
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications" className="py-8 scroll-mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className="pt-0.5">
                <h2 className="text-sm font-semibold">Notifications</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure work order notification preferences per team
                </p>
              </div>
              <div className="md:col-span-2">
                <NotificationSettings />
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section id="privacy" className="py-8 scroll-mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className="pt-0.5">
                <h2 className="text-sm font-semibold">Privacy</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Control your email visibility and data collection preferences
                </p>
              </div>
              <div className="md:col-span-2 space-y-4">
                <EmailPrivacySettings
                  currentEmailPrivate={profile?.email_private || false}
                  onUpdate={() => refetchProfile()}
                />

                <SensitivePrivacySettings
                  currentLimitSensitivePi={(profile as Record<string, unknown>)?.limit_sensitive_pi === true}
                  onUpdate={() => refetchProfile()}
                />

                {/* Privacy Rights */}
                <div className="pt-2 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You can exercise your privacy rights or learn more about our data practices.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/privacy-request">Submit Privacy Request</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/privacy-policy">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        View Privacy Policy
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section id="security" className="py-8 scroll-mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className="pt-0.5">
                <h2 className="text-sm font-semibold">Security</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Monitor your session and account security status
                </p>
              </div>
              <div className="md:col-span-2 space-y-4">
                <MFASettings />
                <SessionStatus />
                <SecurityStatus />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <div className="pt-8" id="danger-zone">
            <div className="rounded-lg border border-destructive/50 overflow-hidden">
              <div className="bg-destructive/5 border-b border-destructive/30 px-4 py-3">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </h3>
              </div>
              <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Reset All Settings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reset all settings to their default values. This action cannot be undone.
                  </p>
                </div>
                <div className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetSettings}
                    className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  return (
    <SettingsProvider>
      <Page maxWidth="7xl" padding="responsive">
        <SettingsContent />
      </Page>
    </SettingsProvider>
  );
};

export default Settings;
