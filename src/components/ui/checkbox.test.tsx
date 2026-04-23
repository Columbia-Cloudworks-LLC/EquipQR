import { describe, it, expect } from "vitest";
import { render } from "@/test/utils/test-utils";
import { screen } from "@testing-library/dom";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("uses 3px focus-visible ring for keyboard contrast (#635)", () => {
    render(<Checkbox aria-label="Accept terms" />);
    const el = screen.getByRole("checkbox", { name: /accept terms/i });
    expect(el).toHaveClass("focus-visible:ring-[3px]");
  });
});
