import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDateInUserSettings,
  formatForExport,
  formatIsoZulu,
  formatRelative,
  formatRelativeDate,
  formatTime,
  formatTimeInUserSettings,
} from "./dateFormatter";
import { UserSettings } from "@/types/settings";

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

/** UTC instant that falls on different calendar dates in ET vs Sydney (AEDT). */
const UTC_CROSS_CALENDAR = "2023-12-24T15:00:00.000Z";

const settingsNy: UserSettings = {
  timezone: "America/New_York",
  dateFormat: "MM/dd/yyyy",
};

const settingsSydney: UserSettings = {
  timezone: "Australia/Sydney",
  dateFormat: "MM/dd/yyyy",
};

describe("dateFormatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatDate", () => {
    it("renders different calendar dates for ET vs Sydney", () => {
      expect(formatDate(UTC_CROSS_CALENDAR, settingsNy)).toMatch(
        /12\/24\/2023/,
      );
      expect(formatDate(UTC_CROSS_CALENDAR, settingsSydney)).toMatch(
        /12\/25\/2023/,
      );
    });

    it("handles Date input", () => {
      expect(formatDate(new Date(UTC_CROSS_CALENDAR), settingsNy)).toMatch(
        /12\/24\/2023/,
      );
    });

    it("respects alternate dateFormat", () => {
      const ddmm: UserSettings = {
        ...settingsNy,
        dateFormat: "dd/MM/yyyy",
      };
      expect(formatDate(UTC_CROSS_CALENDAR, ddmm)).toMatch(/24\/12\/2023/);
    });
  });

  describe("formatDateTime", () => {
    it("renders different date+time for ET vs Sydney", () => {
      const ny = formatDateTime(UTC_CROSS_CALENDAR, settingsNy);
      const au = formatDateTime(UTC_CROSS_CALENDAR, settingsSydney);
      expect(ny).toMatch(/12\/24\/2023/);
      expect(ny).toMatch(/10:00\s+AM/i);
      expect(au).toMatch(/12\/25\/2023/);
      expect(au).toMatch(/2:00\s+AM/i);
    });
  });

  describe("formatTime", () => {
    it("renders local clock differently for ET vs Sydney", () => {
      expect(formatTime(UTC_CROSS_CALENDAR, settingsNy)).toMatch(/10:00\s+AM/i);
      expect(formatTime(UTC_CROSS_CALENDAR, settingsSydney)).toMatch(
        /2:00\s+AM/i,
      );
    });
  });

  describe("formatRelative", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("uses time-only when under 24h (NY vs Sydney)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-12-25T18:00:00.000Z"));
      const recent = "2023-12-25T10:00:00.000Z";
      expect(formatRelative(recent, settingsNy)).toMatch(/5:00\s+AM/i);
      expect(formatRelative(recent, settingsSydney)).toMatch(/9:00\s+PM/i);
    });

    it("uses weekday + time within a week (NY vs Sydney)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-12-25T12:00:00.000Z"));
      const fewDaysAgo = "2023-12-22T15:00:00.000Z";
      const ny = formatRelative(fewDaysAgo, settingsNy);
      const au = formatRelative(fewDaysAgo, settingsSydney);
      expect(ny).not.toBe(au);
      expect(ny).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/i);
      expect(au).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/i);
    });

    it("uses full date when older than a week (NY vs Sydney)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
      const old = "2023-11-05T15:00:00.000Z";
      expect(formatRelative(old, settingsNy)).toMatch(/11\/05\/2023/);
      expect(formatRelative(old, settingsSydney)).toMatch(/11\/06\/2023/);
    });
  });

  describe("formatIsoZulu", () => {
    it("ignores user timezone (always UTC Z)", () => {
      const iso = formatIsoZulu(UTC_CROSS_CALENDAR);
      expect(iso).toBe("2023-12-24T15:00:00.000Z");
      expect(formatIsoZulu(UTC_CROSS_CALENDAR)).toBe(iso);
    });
  });

  describe("formatForExport", () => {
    it("matches ISO Zulu for any viewer timezone", () => {
      expect(formatForExport(UTC_CROSS_CALENDAR)).toBe(
        "2023-12-24T15:00:00.000Z",
      );
    });
  });

  describe("legacy wrappers", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("formatDateInUserSettings delegates to formatDate / formatDateTime", () => {
      expect(formatDateInUserSettings(UTC_CROSS_CALENDAR, settingsNy)).toBe(
        formatDate(UTC_CROSS_CALENDAR, settingsNy),
      );
      expect(
        formatDateInUserSettings(UTC_CROSS_CALENDAR, settingsNy, true),
      ).toBe(formatDateTime(UTC_CROSS_CALENDAR, settingsNy));
    });

    it("formatTimeInUserSettings matches formatTime", () => {
      expect(formatTimeInUserSettings(UTC_CROSS_CALENDAR, settingsNy)).toBe(
        formatTime(UTC_CROSS_CALENDAR, settingsNy),
      );
    });

    it("formatRelativeDate matches formatRelative", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-12-25T18:00:00.000Z"));
      const recent = "2023-12-25T10:00:00.000Z";
      expect(formatRelativeDate(recent, settingsNy)).toBe(
        formatRelative(recent, settingsNy),
      );
    });
  });
});
