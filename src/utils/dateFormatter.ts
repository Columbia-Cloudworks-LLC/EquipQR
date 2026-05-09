import { format, formatInTimeZone } from "date-fns-tz";
import { UserSettings } from "@/types/settings";
import { logger } from "@/utils/logger";

const DEFAULT_TIME_PATTERN = "h:mm a";

const toDate = (date: Date | string): Date =>
  typeof date === "string" ? new Date(date) : date;

export const formatDate = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const dateObj = toDate(date);
  try {
    return formatInTimeZone(dateObj, settings.timezone, settings.dateFormat);
  } catch (error) {
    logger.error("Date formatting failed, using fallback", error);
    return format(dateObj, settings.dateFormat);
  }
};

export const formatDateTime = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const dateObj = toDate(date);
  const pattern = `${settings.dateFormat} ${DEFAULT_TIME_PATTERN}`;
  try {
    return formatInTimeZone(dateObj, settings.timezone, pattern);
  } catch (error) {
    logger.error("DateTime formatting failed, using fallback", error);
    return format(dateObj, pattern);
  }
};

export const formatTime = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const dateObj = toDate(date);
  try {
    return formatInTimeZone(dateObj, settings.timezone, DEFAULT_TIME_PATTERN);
  } catch (error) {
    logger.error("Time formatting failed, using fallback", error);
    return format(dateObj, DEFAULT_TIME_PATTERN);
  }
};

export const formatRelative = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const dateObj = toDate(date);
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return formatTime(dateObj, settings);
  }
  if (diffInHours < 24 * 7) {
    const dayPattern = `EEE ${DEFAULT_TIME_PATTERN}`;
    try {
      return formatInTimeZone(dateObj, settings.timezone, dayPattern);
    } catch (error) {
      logger.error("Relative date formatting failed, using fallback", error);
      return format(dateObj, dayPattern);
    }
  }
  return formatDate(dateObj, settings);
};

export const formatIsoZulu = (date: Date | string): string =>
  toDate(date).toISOString();

export const formatForExport = (date: Date | string): string =>
  formatIsoZulu(date);

export const formatDateInUserSettings = (
  date: Date | string,
  settings: UserSettings,
  includeTime: boolean = false,
): string =>
  includeTime ? formatDateTime(date, settings) : formatDate(date, settings);

export const formatTimeInUserSettings = (
  date: Date | string,
  settings: UserSettings,
): string => formatTime(date, settings);

export const formatRelativeDate = (
  date: Date | string,
  settings: UserSettings,
): string => formatRelative(date, settings);
