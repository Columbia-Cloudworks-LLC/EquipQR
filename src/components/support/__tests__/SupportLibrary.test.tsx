import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@/test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import SupportLibrary from "../SupportLibrary";
import { SUPPORT_ARTICLES } from "../content/articles";

describe("SupportLibrary", () => {
  it("includes an article for each critical persona workflow", () => {
    const ids = new Set(SUPPORT_ARTICLES.map((a) => a.id));
    for (const id of [
      "welcome-to-equipqr",
      "invite-team-members",
      "scan-equipment-qr",
      "create-work-order-from-equipment",
      "update-work-order-status",
      "add-notes-and-photos",
      "pm-checklist",
      "triage-submitted-requests",
      "submit-request-as-requestor",
      "add-inventory-item",
      "parts-managers-setup",
      "alternate-groups-setup",
      "team-role-matrix",
      "apex-example-hierarchy",
      "connect-quickbooks",
      "export-work-order-to-qb",
      "submit-privacy-request",
      "report-an-issue",
      "audit-log-basics",
      "dsr-cockpit-overview",
      "system-status",
      "fleet-map-basics",
    ]) {
      expect(ids.has(id), `missing article ${id}`).toBe(true);
    }
  });

  it("filters articles by role when a persona button is pressed", async () => {
    const user = userEvent.setup();
    render(<SupportLibrary />);

    // Requestor filter should remove technician-only articles from the visible
    // tab content. "Complete a PM checklist" is tagged technician/manager only.
    await user.click(screen.getByRole("button", { name: /^Requestor$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 3,
          name: /Complete a PM checklist/i,
        }),
      ).not.toBeInTheDocument();
    });

    // "Welcome to EquipQR" has persona `all` so it should remain visible in
    // the default Start Here tab after the Requestor filter is applied.
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Welcome to EquipQR/i,
      }),
    ).toBeInTheDocument();
  });

  it("supports search by article title", async () => {
    const user = userEvent.setup();
    render(<SupportLibrary />);
    const searchBox = screen.getByLabelText(/Search support library/i);
    await user.type(searchBox, "QuickBooks");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /Connect QuickBooks/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("hides dashboard-only articles when includeDashboardOnly is false", async () => {
    const user = userEvent.setup();
    render(<SupportLibrary includeDashboardOnly={false} />);
    // Navigate to the Privacy & Support tab where the dashboard-only article lives.
    await user.click(screen.getByRole("tab", { name: /Support/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 3,
          name: /Report a bug or issue/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows dashboard-only articles when includeDashboardOnly is true", async () => {
    const user = userEvent.setup();
    render(<SupportLibrary includeDashboardOnly={true} />);
    const privacyTab = screen.getByRole("tab", { name: /Support/i });
    await user.click(privacyTab);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /Report a bug or issue/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe("category navigation layout", () => {
    it("tablist has auto-height and responsive grid column classes", () => {
      const { container } = render(<SupportLibrary />);
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).not.toBeNull();
      expect(tablist?.className).toContain("!h-auto");
      expect(tablist?.className).toContain("grid-cols-4");
      expect(tablist?.className).toContain("xl:grid-cols-8");
    });

    it("each category tab trigger has a min-height class", () => {
      const { container } = render(<SupportLibrary />);
      const triggers = container.querySelectorAll('[role="tab"]');
      expect(triggers.length).toBeGreaterThan(0);
      for (const trigger of Array.from(triggers)) {
        expect(trigger.className).toContain("min-h-");
      }
    });

    it("tablist does not use a hard-coded inline gridTemplateColumns style", () => {
      const { container } = render(<SupportLibrary />);
      const tablist = container.querySelector('[role="tablist"]');
      const style = (tablist as HTMLElement | null)?.style?.gridTemplateColumns ?? "";
      expect(style).toBe("");
    });
  });
});
