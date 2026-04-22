import { describe, it, expect } from "vitest";
import {
  MC_FOCUS_RING,
  MC_FOCUS_VISIBLE_RING,
  MC_FOCUS_VISIBLE_SIDEBAR,
} from "./mission-control-focus";

describe("mission-control-focus (#635 shared tokens)", () => {
  it("uses 3px ring width for high-contrast keyboard / pointer focus", () => {
    expect(MC_FOCUS_VISIBLE_RING).toMatch(/ring-\[3px\]/);
    expect(MC_FOCUS_RING).toMatch(/ring-\[3px\]/);
    expect(MC_FOCUS_VISIBLE_SIDEBAR).toMatch(/ring-\[3px\]/);
  });
});
