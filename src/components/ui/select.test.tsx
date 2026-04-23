import { describe, it, expect } from "vitest";
import { render } from "@/test/utils/test-utils";
import { screen } from "@testing-library/dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

describe("SelectTrigger", () => {
  it("matches mission-control field height and 3px focus ring (#635)", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Test select">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    const el = screen.getByRole("combobox", { name: /test select/i });
    expect(el).toHaveClass("min-h-[44px]");
    expect(el).toHaveClass("focus:ring-[3px]");
  });
});
