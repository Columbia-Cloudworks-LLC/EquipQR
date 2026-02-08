import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Support, { DashboardSupport } from '../Support';

// Mock sub-components
vi.mock('@/components/support/SupportTabs', () => ({
  default: () => <div data-testid="support-tabs">Support Tabs</div>
}));

vi.mock('@/components/landing/LandingHeader', () => ({
  default: () => <div data-testid="landing-header">Landing Header</div>
}));

vi.mock('@/components/layout/LegalFooter', () => ({
  default: () => <div data-testid="legal-footer">Legal Footer</div>
}));

vi.mock('@/features/tickets/components/SubmitTicketDialog', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div data-testid="submit-ticket-dialog">
        <span>Report an Issue Dialog</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}));

vi.mock('@/features/tickets/components/MyTickets', () => ({
  default: () => <div data-testid="my-tickets">My Tickets</div>
}));

describe('Support Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DashboardSupport', () => {
    it('renders page title', () => {
      render(<DashboardSupport />);

      expect(screen.getByText('Support & Documentation')).toBeInTheDocument();
    });

    it('renders page description', () => {
      render(<DashboardSupport />);

      expect(screen.getByText(/Find answers to common questions/)).toBeInTheDocument();
    });

    it('renders support tabs component', () => {
      render(<DashboardSupport />);

      expect(screen.getByTestId('support-tabs')).toBeInTheDocument();
    });

    it('renders contact section with email', () => {
      render(<DashboardSupport />);

      expect(screen.getByText('Get Help')).toBeInTheDocument();
      expect(screen.getByText(/We're here to help/)).toBeInTheDocument();
    });

    it('renders email link', () => {
      render(<DashboardSupport />);

      const emailLink = screen.getByRole('link', { name: /nicholas.king@columbiacloudworks.com/i });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:nicholas.king@columbiacloudworks.com');
    });

    it('renders response time information', () => {
      render(<DashboardSupport />);

      expect(screen.getByText(/Response time: Within 24 hours/)).toBeInTheDocument();
    });

    it('renders "Report an Issue" button', () => {
      render(<DashboardSupport />);

      expect(screen.getByRole('button', { name: /report an issue/i })).toBeInTheDocument();
    });

    it('opens the submit-ticket dialog when "Report an Issue" is clicked', () => {
      render(<DashboardSupport />);

      // Dialog should not be visible initially
      expect(screen.queryByTestId('submit-ticket-dialog')).not.toBeInTheDocument();

      // Click the Report an Issue button
      fireEvent.click(screen.getByRole('button', { name: /report an issue/i }));

      // Dialog should now be visible
      expect(screen.getByTestId('submit-ticket-dialog')).toBeInTheDocument();
    });

    it('renders the My Tickets section', () => {
      render(<DashboardSupport />);

      expect(screen.getByTestId('my-tickets')).toBeInTheDocument();
    });
  });

  describe('Public Support', () => {
    it('renders landing header', () => {
      render(<Support />);

      expect(screen.getByTestId('landing-header')).toBeInTheDocument();
    });

    it('renders page title', () => {
      render(<Support />);

      expect(screen.getByText('Support & Documentation')).toBeInTheDocument();
    });

    it('renders support tabs component', () => {
      render(<Support />);

      expect(screen.getByTestId('support-tabs')).toBeInTheDocument();
    });

    it('renders contact section', () => {
      render(<Support />);

      expect(screen.getByText('Get Help')).toBeInTheDocument();
    });

    it('renders legal footer', () => {
      render(<Support />);

      expect(screen.getByTestId('legal-footer')).toBeInTheDocument();
    });

    it('renders call to action section', () => {
      render(<Support />);

      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
    });
  });
});

