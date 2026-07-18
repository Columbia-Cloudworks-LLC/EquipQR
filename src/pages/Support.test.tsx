import React from "react";
import { render, screen, fireEvent } from "@vitest-harness/utils/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Support, { DashboardSupport } from "./Support";

const mockOpenBugReport = vi.fn();
vi.mock("@/features/tickets/context/BugReportContext", () => ({
  useBugReport: () => ({ openBugReport: mockOpenBugReport }),
}));

vi.mock("@/components/landing/LandingHeader", () => ({
  default: () => <div data-testid="landing-header">Landing Header</div>,
}));

vi.mock("@/components/layout/LegalFooter", () => ({
  default: () => <div data-testid="legal-footer">Legal Footer</div>,
}));

vi.mock("@/features/tickets/components/MyTickets", () => ({
  default: () => <div data-testid="my-tickets">My Tickets</div>,
}));

vi.mock("@/lib/documentationUrl", () => ({
  SUPPORT_DOCS_URL: "http://localhost:5174/support",
}));

describe("Support Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DashboardSupport", () => {
    it("renders page title and description", () => {
      render(<DashboardSupport />);
      expect(screen.getByText("Support")).toBeInTheDocument();
      expect(
        screen.getByText(/Report issues, track your tickets/i),
      ).toBeInTheDocument();
    });

    it("links to the Help Center on equipqr.info", () => {
      render(<DashboardSupport />);
      const link = screen.getByRole("link", { name: /browse guides/i });
      expect(link).toHaveAttribute("href", "http://localhost:5174/support");
      expect(link).toHaveAttribute("target", "_blank");
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
    });

    it("renders the Report an Issue CTA and triggers the ticket dialog", () => {
      render(<DashboardSupport />);
      fireEvent.click(screen.getByRole("button", { name: /report an issue/i }));
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

    it("links to the Help Center", () => {
      render(<Support />);
      expect(screen.getByRole("link", { name: /browse guides/i })).toHaveAttribute(
        "href",
        "http://localhost:5174/support",
      );
    });

    it("does not render the dashboard-only bug report CTA or My Tickets section", () => {
      render(<Support />);
      expect(
        screen.queryByRole("button", { name: /report an issue/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("my-tickets")).not.toBeInTheDocument();
    });
  });
});
