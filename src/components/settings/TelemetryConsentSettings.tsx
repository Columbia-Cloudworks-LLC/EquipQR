import React from 'react';
import { toast } from 'sonner';
import { Activity } from 'lucide-react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { SettingsToggleRow } from './SettingsToggleRow';

/** Opt-in / opt-out for Microsoft Clarity diagnostic session replay. */
export const TelemetryConsentSettings: React.FC = () => {
  const { telemetryAvailable, canUseTelemetry, setTelemetryConsent } = useCookieConsent();

  if (!telemetryAvailable) return null;

  const handleChange = (enabled: boolean) => {
    if (!setTelemetryConsent(enabled)) return;
    toast.success(
      enabled
        ? 'Diagnostic session data enabled. Thank you for helping improve EquipQR.'
        : 'Diagnostic session data disabled',
    );
  };

  return (
    <SettingsToggleRow
      id="telemetry-consent"
      label="Help improve EquipQR with diagnostic session data"
      description="Shares masked session replays and usage heatmaps (Microsoft Clarity) so we can find and fix interface problems. Text and form fields are masked in your browser."
      checked={canUseTelemetry}
      onCheckedChange={handleChange}
      icon={<Activity className="h-4 w-4" />}
    />
  );
};
