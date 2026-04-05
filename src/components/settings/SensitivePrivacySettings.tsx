import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { SettingsToggleRow } from './SettingsToggleRow';

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
    <SettingsToggleRow
      id="limit-sensitive-pi"
      label="Disable GPS collection for my scans"
      description="When enabled, your QR code scans will not capture GPS coordinates even if your organization has location collection turned on"
      checked={limitSensitivePi}
      onCheckedChange={handleUpdate}
      loading={isLoading}
      icon={<MapPin className="h-4 w-4" />}
    />
  );
};
