import { useContext, useMemo } from 'react';

import { SettingsContext } from '@/contexts/settings-context';
import { defaultUserSettings } from '@/types/settings';
import {
  formatDate,
  formatDateTime,
  formatForExport,
  formatIsoZulu,
  formatRelative,
  formatTime,
} from '@/utils/dateFormatter';

export function useFormatTimestamp() {
  const settingsContext = useContext(SettingsContext);
  const settings = settingsContext?.settings ?? defaultUserSettings;

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
