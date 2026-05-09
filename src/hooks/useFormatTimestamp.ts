import { useMemo } from 'react';

import { useUserSettings } from '@/hooks/useUserSettings';
import {
  formatDate,
  formatDateTime,
  formatForExport,
  formatIsoZulu,
  formatRelative,
  formatTime,
} from '@/utils/dateFormatter';

export function useFormatTimestamp() {
  const { settings } = useUserSettings();

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
