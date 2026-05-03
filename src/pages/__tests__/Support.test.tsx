import React from "react";
import { render, screen, fireEvent } from "@/test/utils/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Support, { DashboardSupport } from "../Support";

// Mock the BugReport context so DashboardSupport can render without the provider.
const mockOpenBugReport = vi.fn();
vi.mock("@/features/tickets/context/BugReportContext", () => ({
  useBugReport: () => ({ openBugReport: mockOpenBugReport }),
}));

// Mock sub-components. We capture the props SupportTabs receives so we can
// assert on the dashboard-vs-public includeDashboardOnly flag.
const supportTabsProps: Array<Record<string, unknown>> = [];
vi.mock("@/components/support/SupportTabs", () => ({
  default: (props: Record<string, unknown>) => {
    supportTabsProps.push(props);
    return (
      <div
        data-testid="support-tabs"
        data-include-dashboard-only={String(props.includeDashboardOnly)}
      >
        Support Tabs
      </div>
    );
  },
}));

vi.mock("@/components/landing/LandingHeader", () => ({
  default: () => <div data-testid="landing-header">Landing Header</div>,
}));

vi.mock("@/components/layout/LegalFooter", () => ({
  default: () => <div data-testid="legal-footer">Legal Footer</div>,
}));

vi.mock("@/features/tickets/components/SubmitTicketDialog", () => ({
  default: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="submit-ticket-dialog">
        <span>Report an Issue Dialog</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/features/tickets/components/MyTickets", () => ({
  default: () => <div data-testid="my-tickets">My Tickets</div>,
}));

describe("Support Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supportTabsProps.length = 0;
  });

  describe("DashboardSupport", () => {
    it("renders page title and description", () => {
      render(<DashboardSupport />);
      expect(screen.getByText("Support & Documentation")).toBeInTheDocument();
      expect(
        screen.getByText(/Step-by-step guides, role references/i),
      ).toBeInTheDocument();
    });

    it("renders the support library with dashboard-only articles included", () => {
      render(<DashboardSupport />);
      const tabs = screen.getByTestId("support-tabs");
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute("data-include-dashboard-only", "true");
    });

    it("renders the Get Help card with support channels", () => {
      render(<DashboardSupport />);
      expect(screen.getByText("Get Help")).toBeInTheDocument();
      const emailLink = screen.getByRole("link", {
        name: /nicholas.king@columbiacloudworks.com/i,
      });
      expect(emailLink).toHaveAttribute(
        "href",
        "mailto:nicholas.king@columbiacloudworks.com",
      );
      expect(
        screen.getByText(/Response time: Within 24 hours/i),
      ).toBeInTheDocument();
    });

    it("renders the Report an Issue CTA and triggers the ticket dialog", () => {
      render(<DashboardSupport />);
      const button = screen.getByRole("button", {
        name: /report an issue/i,
      });
      fireEvent.click(button);
      expect(mockOpenBugReport).toHaveBeenCalledTimes(1);
    });

    it("renders the My Reported Issues section", () => {
      render(<DashboardSupport />);
      expect(screen.getByTestId("my-tickets")).toBeInTheDocument();
    });
  });

  describe("Public Support", () => {
    it("renders landing header and legal footer", () => {
      render(<Support />);
      expect(screen.getByTestId("landing-header")).toBeInTheDocument();
      expect(screen.getByTestId("legal-footer")).toBeInTheDocument();
    });

    it("renders the support library with dashboard-only articles excluded", () => {
      render(<Support />);
      const tabs = screen.getByTestId("support-tabs");
      expect(tabs).toHaveAttribute("data-include-dashboard-only", "false");
    });

    it("does not render the dashboard-only bug report CTA or My Tickets section", () => {
      render(<Support />);
      expect(
        screen.queryByRole("button", { name: /report an issue/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("my-tickets")).not.toBeInTheDocument();
    });

    it("renders the call-to-action without stale marketing copy", () => {
      render(<Support />);
      expect(screen.getByText(/Ready to get started/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /get started/i }),
      ).toBeInTheDocument();
      // Sanity-check: stale "Join thousands" copy must not reappear.
      expect(
        screen.queryByText(/Join thousands/i),
      ).not.toBeInTheDocument();
    });
  });
});
