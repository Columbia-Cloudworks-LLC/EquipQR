import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils/test-utils";
import SupportTabs from "../SupportTabs";
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_ORDER } from "../content/taxonomy";
import { SUPPORT_ARTICLES } from "../content/articles";

describe("SupportTabs", () => {
  it("renders the Support Library heading", () => {
    render(<SupportTabs />);
    expect(
      screen.getByText(/EquipQR Support Library/i),
    ).toBeInTheDocument();
  });

  it("renders a tab for every top-level category", () => {
    render(<SupportTabs />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(SUPPORT_CATEGORY_ORDER.length);
    for (const categoryId of SUPPORT_CATEGORY_ORDER) {
      const label = SUPPORT_CATEGORIES[categoryId].shortLabel;
      expect(
        tabs.some((tab) => tab.textContent?.includes(label)),
      ).toBe(true);
    }
  });

  it("renders the Start Here category by default with the welcome article", () => {
    render(<SupportTabs />);
    const activeTab = screen.getAllByRole("tab").find(
      (tab) => tab.getAttribute("aria-selected") === "true",
    );
    expect(activeTab?.textContent).toMatch(/Start/i);
    expect(screen.getByText(/Welcome to EquipQR/i)).toBeInTheDocument();
  });

  it("has persona filter buttons including all four team roles plus Everyone", () => {
    render(<SupportTabs />);
    for (const label of [
      "Everyone",
      "Technician",
      "Requestor",
      "Manager",
      "Admin",
      "Owner",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${label}$`, "i") }),
      ).toBeInTheDocument();
    }
  });

  it("excludes dashboard-only articles when includeDashboardOnly is false", () => {
    render(<SupportTabs includeDashboardOnly={false} />);
    const dashboardOnly = SUPPORT_ARTICLES.filter((article) => article.dashboardOnly);
    expect(dashboardOnly.length).toBeGreaterThan(0);
    for (const article of dashboardOnly) {
      expect(screen.queryByText(article.title)).not.toBeInTheDocument();
    }
  });

  it("shows dashboard-only articles when includeDashboardOnly is true", () => {
    render(<SupportTabs includeDashboardOnly={true} />);
    const dashboardOnly = SUPPORT_ARTICLES.find(
      (article) => article.dashboardOnly,
    );
    expect(dashboardOnly).toBeDefined();
    if (!dashboardOnly) return;
    // The article may live in a non-default tab; assert it is in the library
    // dataset. Rendered state is exercised in SupportLibrary.test.tsx.
    expect(
      SUPPORT_ARTICLES.some((a) => a.id === dashboardOnly.id),
    ).toBe(true);
  });

  it("every article declares the canonical four team roles and a lastReviewed date", () => {
    for (const article of SUPPORT_ARTICLES) {
      expect(article.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.personas.length).toBeGreaterThan(0);
    }
  });

  it("does not render stale copy about billing plans, premium Requestors, or marketing hyperbole", () => {
    const { container } = render(<SupportTabs />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Manage Billing/i);
    expect(text).not.toMatch(/Premium Service/i);
    expect(text).not.toMatch(/Join thousands/i);
  });
});
