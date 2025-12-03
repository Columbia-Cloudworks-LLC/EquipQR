
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { useSettings } from '@/contexts/useSettings';
import PersonalizationSettings from '@/components/settings/PersonalizationSettings';
import ProfileSettings from '@/components/settings/ProfileSettings';
import { EmailPrivacySettings } from '@/components/settings/EmailPrivacySettings';
import { SecurityStatus } from '@/components/security/SecurityStatus';
import { SessionStatus } from '@/components/session/SessionStatus';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Page from '@/components/layout/Page';


const SettingsContent = () => {
  const { resetSettings } = useSettings();
  const { user } = useAuth();

  // Fetch current email privacy setting
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('email_private')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleResetSettings = () => {
    resetSettings();
    toast.success('Settings have been reset to default values');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and application settings.
        </p>
      </div>

      <ProfileSettings />

      <PersonalizationSettings />

      <NotificationSettings />

      <EmailPrivacySettings 
        currentEmailPrivate={profile?.email_private || false}
        onUpdate={() => refetchProfile()}
      />

      {/* Security & Status */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Security & Status</h2>
          <p className="text-sm text-muted-foreground">Monitor your account security and session status</p>
        </div>
        <div className="space-y-4">
          <SessionStatus />
          <SecurityStatus />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reset Settings</CardTitle>
          <CardDescription>
            Reset all settings to their default values. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleResetSettings}>
            Reset All Settings
          </Button>
        </CardContent>
      </Card>
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
