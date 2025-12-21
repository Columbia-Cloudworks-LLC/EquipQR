import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
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
      expect(screen.getByRole('link', { name: /start free trial/i })).toBeInTheDocument();
    });
  });
});

