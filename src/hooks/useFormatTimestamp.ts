import { useContext, useMemo } from 'react';

import { SettingsContext } from '@/contexts/settings-context';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  formatDate,
  formatDateTime,
  formatForExport,
  formatIsoZulu,
  formatRelative,
  formatTime,
} from '@/utils/dateFormatter';

/**
 * Prefer settings from SettingsProvider when mounted (e.g. Settings page).
 * Otherwise read persisted personalization from useUserSettings (e.g. audit explorer).
 */
export function useFormatTimestamp() {
  const settingsContext = useContext(SettingsContext);
  const userSettingsFallback = useUserSettings();
  const settings =
    settingsContext !== undefined
      ? settingsContext.settings
      : userSettingsFallback.settings;

  return useMemo(
    () => ({
      formatDate: (date: Date | string) => formatDate(date, settings),
      formatDateTime: (date: Date | string) => formatDateTime(date, settings),
      formatTime: (date: Date | string) => formatTime(date, settings),
      formatRelative: (date: Date | string) => formatRelative(date, settings),
      formatIsoZulu,
      formatForExport,
    }),
    [settings]
  );
}
