import { describe, it, expect } from "vitest";
import { formatDate } from "./workOrderHelpers";

/** Same UTC instant as dateFormatter tests — different calendar date in Sydney (AEDT). */
const UTC_CROSS_CALENDAR = "2023-12-24T15:00:00.000Z";

const sydney: { timezone: string; dateFormat: string } = {
  timezone: "Australia/Sydney",
  dateFormat: "MM/dd/yyyy",
};

describe("workOrderHelpers (#768)", () => {
  it("formatDate delegates to user timezone (Sydney)", () => {
    expect(formatDate(UTC_CROSS_CALENDAR, sydney)).toMatch(/12\/25\/2023/);
  });

  it("formatDate returns em dash for empty values", () => {
    expect(formatDate(null, sydney)).toBe("—");
    expect(formatDate(undefined, sydney)).toBe("—");
  });
});
