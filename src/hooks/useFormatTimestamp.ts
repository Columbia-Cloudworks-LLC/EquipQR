import { useMemo } from 'react';

import { useSettings } from '@/contexts/useSettings';
import {
  formatDate,
  formatDateTime,
  formatForExport,
  formatIsoZulu,
  formatRelative,
  formatTime,
} from '@/utils/dateFormatter';

export function useFormatTimestamp() {
  const { settings } = useSettings();

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
