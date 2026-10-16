import React from 'react';
import { toast } from 'sonner';
import { Activity } from 'lucide-react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { getClarityProjectId } from '@/lib/telemetryConsent';
import { getGaMeasurementId } from '@/lib/googleAnalytics';
import { SettingsToggleRow } from './SettingsToggleRow';

/** Opt-in / opt-out for Google Analytics 4 and Microsoft Clarity session replay. */
export const TelemetryConsentSettings: React.FC = () => {
  const { telemetryAvailable, canUseTelemetry, setTelemetryConsent } = useCookieConsent();

  if (!telemetryAvailable) return null;

  const descriptions: string[] = [];
  if (getGaMeasurementId() !== null) {
    descriptions.push('Shares page-visit analytics (Google Analytics) so we can see how people find and use EquipQR.');
  }
  if (getClarityProjectId() !== null) {
    descriptions.push(
      'Shares masked session replays and usage heatmaps (Microsoft Clarity) so we can find and fix interface problems. Text and form fields are masked in your browser.',
    );
  }

  const handleChange = (enabled: boolean) => {
    if (!setTelemetryConsent(enabled)) return;
    toast.success(
      enabled
        ? 'Usage analytics enabled. Thank you for helping improve EquipQR.'
        : 'Usage analytics disabled',
    );
  };

  return (
    <SettingsToggleRow
      id="telemetry-consent"
      label="Help improve EquipQR with usage analytics"
      description={descriptions.join(' ')}
      checked={canUseTelemetry}
      onCheckedChange={handleChange}
      icon={<Activity className="h-4 w-4" />}
    />
  );
};
