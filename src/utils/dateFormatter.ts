import { format, formatInTimeZone } from 'date-fns-tz';
import { UserSettings } from '@/types/settings';
import { logger } from '@/utils/logger';

export const formatDateInUserSettings = (
  date: Date | string,
  settings: UserSettings,
  includeTime: boolean = false
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  let formatPattern: string = settings.dateFormat;
  
  if (includeTime) {
    const timePattern = 'h:mm a'; // Default to 12-hour format
    formatPattern = `${formatPattern} ${timePattern}`;
  }
  
  try {
    return formatInTimeZone(dateObj, settings.timezone, formatPattern);
  } catch (error) {
    // Fallback to default formatting if timezone or format fails
    logger.warn('Date formatting failed, using fallback', error);
    return format(dateObj, formatPattern);
  }
};

export const formatTimeInUserSettings = (
  date: Date | string,
  settings: UserSettings
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const timePattern = 'h:mm a'; // Default to 12-hour format
  
  try {
    return formatInTimeZone(dateObj, settings.timezone, timePattern);
  } catch (error) {
    logger.warn('Time formatting failed, using fallback', error);
    return format(dateObj, timePattern);
  }
};

export const formatRelativeDate = (
  date: Date | string,
  settings: UserSettings
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return formatTimeInUserSettings(dateObj, settings);
  } else if (diffInHours < 24 * 7) {
    // Within a week, show day and time
    const dayPattern = 'EEE h:mm a'; // Default to 12-hour format
    try {
      return formatInTimeZone(dateObj, settings.timezone, dayPattern);
    } catch {
      return format(dateObj, dayPattern);
    }
  } else {
    // More than a week, show full date
    return formatDateInUserSettings(dateObj, settings);
  }
};