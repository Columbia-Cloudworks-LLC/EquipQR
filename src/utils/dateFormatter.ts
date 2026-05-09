import { format, formatInTimeZone } from "date-fns-tz";
import { UserSettings, defaultUserSettings } from "@/types/settings";
import { logger } from "@/utils/logger";

const DEFAULT_TIME_PATTERN = "h:mm a";

const toDate = (date: Date | string): Date =>
  typeof date === "string" ? new Date(date) : date;

function resolveFormattingSettings(settings: UserSettings): UserSettings {
  const timezone =
    typeof settings.timezone === "string" && settings.timezone.trim().length > 0
      ? settings.timezone.trim()
      : defaultUserSettings.timezone;
  const dateFormat = settings.dateFormat ?? defaultUserSettings.dateFormat;
  return { ...settings, timezone, dateFormat };
}

export const formatDate = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const s = resolveFormattingSettings(settings);
  const dateObj = toDate(date);
  try {
    return formatInTimeZone(dateObj, s.timezone, s.dateFormat);
  } catch (error) {
    logger.error("Date formatting failed, using fallback", error);
    return format(dateObj, s.dateFormat);
  }
};

export const formatDateTime = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const s = resolveFormattingSettings(settings);
  const dateObj = toDate(date);
  const pattern = `${s.dateFormat} ${DEFAULT_TIME_PATTERN}`;
  try {
    return formatInTimeZone(dateObj, s.timezone, pattern);
  } catch (error) {
    logger.error("DateTime formatting failed, using fallback", error);
    return format(dateObj, pattern);
  }
};

export const formatTime = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const s = resolveFormattingSettings(settings);
  const dateObj = toDate(date);
  try {
    return formatInTimeZone(dateObj, s.timezone, DEFAULT_TIME_PATTERN);
  } catch (error) {
    logger.error("Time formatting failed, using fallback", error);
    return format(dateObj, DEFAULT_TIME_PATTERN);
  }
};

export const formatRelative = (
  date: Date | string,
  settings: UserSettings,
): string => {
  const s = resolveFormattingSettings(settings);
  const dateObj = toDate(date);
  const now = new Date();
  const diffInHours =
    Math.abs(now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return formatTime(dateObj, s);
  }
  if (diffInHours < 24 * 7) {
    const dayPattern = `EEE ${DEFAULT_TIME_PATTERN}`;
    try {
      return formatInTimeZone(dateObj, s.timezone, dayPattern);
    } catch (error) {
      logger.error("Relative date formatting failed, using fallback", error);
      return format(dateObj, dayPattern);
    }
  }
  return formatDate(dateObj, s);
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
