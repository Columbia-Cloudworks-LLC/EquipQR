import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MapPin, ShieldAlert } from 'lucide-react';

interface SensitivePrivacySettingsProps {
  currentLimitSensitivePi?: boolean;
  onUpdate?: (limitSensitivePi: boolean) => void;
}

export const SensitivePrivacySettings: React.FC<SensitivePrivacySettingsProps> = ({
  currentLimitSensitivePi = false,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [limitSensitivePi, setLimitSensitivePi] = useState(currentLimitSensitivePi);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (newValue: boolean) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ limit_sensitive_pi: newValue } as Record<string, unknown>)
        .eq('id', user.id);

      if (error) throw error;

      setLimitSensitivePi(newValue);
      onUpdate?.(newValue);

      toast.success(
        newValue
          ? 'GPS data collection has been disabled for your scans'
          : 'GPS data collection has been re-enabled for your scans',
      );
    } catch (error) {
      console.error('Failed to update sensitive PI preference:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Sensitive Personal Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription>
          Control how your sensitive personal information is used. Under the California
          Privacy Rights Act (CPRA), you have the right to limit the use of sensitive
          personal information, including precise geolocation.
        </CardDescription>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="limit-sensitive-pi" className="text-sm font-medium">
                Disable GPS collection for my scans
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, your QR code scans will not capture GPS coordinates
                even if your organization has location collection turned on
              </p>
            </div>
          </div>
          <Switch
            id="limit-sensitive-pi"
            checked={limitSensitivePi}
            onCheckedChange={handleUpdate}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};
