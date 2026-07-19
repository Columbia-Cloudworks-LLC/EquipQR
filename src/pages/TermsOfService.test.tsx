import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import TermsOfService from './TermsOfService';

vi.mock('react-router-dom', async () => {
  const { createReactRouterDomTestMock } = await import(
    '@vitest-harness/utils/react-router-dom-test-mock'
  );
  return createReactRouterDomTestMock();
});

describe('TermsOfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shell, heading hierarchy, and layout', () => {
    const { container } = render(<TermsOfService />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Terms of Service');
    expect(screen.getByText('Last Updated: 10/24/2025')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(1);
    expect(container.querySelector('div.container.mx-auto.px-4.py-8.max-w-4xl')).toBeInTheDocument();
    expect(container.querySelector('div.space-y-8')).toBeInTheDocument();
    expect(screen.getByText('Who We Are & How These Terms Work.').closest('div')).toBeInTheDocument();
    expect(screen.getByText('1) The Service.').closest('div')).toBeInTheDocument();
  });

  it('covers core contractual sections', () => {
    render(<TermsOfService />);

    expect(screen.getByText('Who We Are & How These Terms Work.')).toBeInTheDocument();
    expect(screen.getByText(/These Terms of Service.*are a contract between/i)).toBeInTheDocument();
    expect(screen.getByText('1) The Service.')).toBeInTheDocument();
    expect(screen.getByText(/fleet equipment management platform/i)).toBeInTheDocument();
    expect(screen.getByText('2) Accounts & Organization Admins.')).toBeInTheDocument();
    expect(screen.getByText(/You must provide accurate registration details/i)).toBeInTheDocument();
    expect(screen.getByText('3) Acceptable Use.')).toBeInTheDocument();
    expect(screen.getByText(/scrape, bulk-export, or rate-limit-evade/i)).toBeInTheDocument();
    expect(screen.getByText(/probe, scan, or test the vulnerability/i)).toBeInTheDocument();
    expect(screen.getByText(/access the Service to build a competing product/i)).toBeInTheDocument();
    expect(screen.getByText('6) Subscriptions; Billing; Taxes.')).toBeInTheDocument();
    expect(screen.getByText(/auto-renew/i)).toBeInTheDocument();
    expect(screen.getByText(/Fees are non-refundable/i)).toBeInTheDocument();
    expect(screen.getByText('8) Suspension & Termination.')).toBeInTheDocument();
    expect(screen.getByText(/materially breach these Terms/i)).toBeInTheDocument();
    expect(screen.getByText('9) Intellectual Property; License; Feedback.')).toBeInTheDocument();
    expect(screen.getByText(/reverse engineer, decompile, disassemble/i)).toBeInTheDocument();
    expect(screen.getByText('11) Disclaimers.')).toBeInTheDocument();
    expect(screen.getByText(/THE SERVICE IS PROVIDED/i)).toBeInTheDocument();
    expect(screen.getByText(/WE DISCLAIM ALL WARRANTIES/i)).toBeInTheDocument();
    expect(screen.getByText('12) Limitation of Liability.')).toBeInTheDocument();
    expect(screen.getByText(/amounts you actually paid/i)).toBeInTheDocument();
    expect(screen.getByText('13) Changes to These Terms.')).toBeInTheDocument();
    expect(screen.getByText(/We may update these Terms/i)).toBeInTheDocument();
    expect(screen.getByText(/14\) Governing Law; Venue; Notices; Miscellaneous\./)).toBeInTheDocument();
    expect(screen.getByText(/governed by the laws of/i)).toBeInTheDocument();
    expect(screen.getByText('15) Entire Agreement.')).toBeInTheDocument();
    expect(screen.getByText(/These Terms are the entire agreement/i)).toBeInTheDocument();
    expect(screen.getByText('16) Contact.')).toBeInTheDocument();
  });

  it('includes privacy, company, and contact links', () => {
    render(<TermsOfService />);

    const privacyLink = screen
      .getAllByRole('link')
      .find((a) => (a as HTMLAnchorElement).getAttribute('href') === '/privacy-policy');
    expect(privacyLink).toBeTruthy();

    const links = screen.queryAllByText('COLUMBIA CLOUDWORKS LLC');
    links.forEach((link) => {
      expect(link.closest('a')).toHaveAttribute('href', 'https://columbiacloudworks.com');
      expect(link.closest('a')).toHaveAttribute('target', '_blank');
      expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });
    expect(screen.getByText(/nicholas\.king@columbiacloudworks\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/equipqr\.app/i)).toBeInTheDocument();
  });
});
