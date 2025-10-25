import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import TermsOfService from '../TermsOfService';

// Mock Link from react-router-dom with partial mock
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>{children}</a>
    )
  };
});

describe('TermsOfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure', () => {
    it('renders the page without crashing', () => {
      render(<TermsOfService />);
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('displays the main heading', () => {
      render(<TermsOfService />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Terms of Service');
    });

    it('shows static last updated date', () => {
      render(<TermsOfService />);
      expect(screen.getByText('Last Updated: 10/24/2025')).toBeInTheDocument();
    });

    it('includes back to dashboard link', () => {
      render(<TermsOfService />);
      
      const backLink = screen.getByRole('link', { name: /back to dashboard/i });
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('Terms Sections', () => {
    it('displays who we are section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('Who We Are & How These Terms Work.')).toBeInTheDocument();
      expect(screen.getByText(/These Terms of Service.*are a contract between/i)).toBeInTheDocument();
    });

    it('displays service description section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('1) The Service.')).toBeInTheDocument();
      expect(screen.getByText(/fleet equipment management platform/i)).toBeInTheDocument();
    });

    it('displays accounts & organization admins section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('2) Accounts & Organization Admins.')).toBeInTheDocument();
      expect(screen.getByText(/You must provide accurate registration details/i)).toBeInTheDocument();
    });

    it('displays acceptable use section with specifics', () => {
      render(<TermsOfService />);
      expect(screen.getByText('3) Acceptable Use.')).toBeInTheDocument();
      expect(screen.getByText(/scrape, bulk-export, or rate-limit-evade/i)).toBeInTheDocument();
    });

    it('displays subscriptions; billing; taxes section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('6) Subscriptions; Billing; Taxes.')).toBeInTheDocument();
      expect(screen.getByText(/auto-renew/i)).toBeInTheDocument();
      expect(screen.getByText(/Fees are non-refundable/i)).toBeInTheDocument();
    });

    it('displays suspension & termination section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('8) Suspension & Termination.')).toBeInTheDocument();
      expect(screen.getByText(/fail to cure within 10 days/i)).toBeInTheDocument();
    });

    it('displays disclaimers section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('11) Disclaimers.')).toBeInTheDocument();
      expect(screen.getByText(/THE SERVICE IS PROVIDED/i)).toBeInTheDocument();
    });

    it('displays limitation of liability with monetary cap', () => {
      render(<TermsOfService />);
      expect(screen.getByText('12) Limitation of Liability.')).toBeInTheDocument();
      expect(screen.getByText(/our total liability.*12 months/i)).toBeInTheDocument();
    });

    it('displays governing law and miscellaneous section', () => {
      render(<TermsOfService />);
      expect(screen.getByText(/14\) Governing Law; Venue; Notices; Miscellaneous\./)).toBeInTheDocument();
      expect(screen.getByText(/exclusive jurisdiction and venue.*Delaware/i)).toBeInTheDocument();
    });

    it('displays intellectual property; license; feedback section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('9) Intellectual Property; License; Feedback.')).toBeInTheDocument();
      expect(screen.getByText(/reverse engineer, decompile, disassemble/i)).toBeInTheDocument();
    });

    it('displays changes to these terms section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('13) Changes to These Terms.')).toBeInTheDocument();
      expect(screen.getByText(/30 days’ prior notice/i)).toBeInTheDocument();
    });

    it('displays entire agreement section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('15) Entire Agreement.')).toBeInTheDocument();
      expect(screen.getByText(/These Terms are the entire agreement/i)).toBeInTheDocument();
    });

    it('displays contact section', () => {
      render(<TermsOfService />);
      expect(screen.getByText('16) Contact.')).toBeInTheDocument();
      expect(screen.getByText(/nicholas\.king@columbiacloudworks\.com/i)).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('includes Privacy Policy cross-link', () => {
      render(<TermsOfService />);
      const privacyLink = screen.getAllByRole('link').find(a => (a as HTMLAnchorElement).getAttribute('href') === '/privacy-policy');
      expect(privacyLink).toBeTruthy();
    });

    it('includes Columbia CloudWorks links where present with correct attributes', () => {
      render(<TermsOfService />);
      
      const links = screen.queryAllByText('COLUMBIA CLOUDWORKS LLC');
      links.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', 'https://columbiacloudworks.com');
        expect(link.closest('a')).toHaveAttribute('target', '_blank');
        expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('includes correct contact email', () => {
      render(<TermsOfService />);
      
      expect(screen.getByText(/nicholas\.king@columbiacloudworks\.com/i)).toBeInTheDocument();
    });

    it('includes correct website URL', () => {
      render(<TermsOfService />);
      
      expect(screen.getByText(/https:\/\/equipqr\.app/i)).toBeInTheDocument();
    });
  });

  describe('Legal Content', () => {
    it('includes proper list formatting in acceptable use section', () => {
      render(<TermsOfService />);
      expect(screen.getByText(/probe, scan, or test the vulnerability/i)).toBeInTheDocument();
      expect(screen.getByText(/access the Service to build a competing product/i)).toBeInTheDocument();
      expect(screen.getByText(/scrape, bulk-export, or rate-limit-evade/i)).toBeInTheDocument();
    });

    it('displays all caps legal text correctly', () => {
      render(<TermsOfService />);
      
      // Should display legal disclaimers in all caps as intended
      expect(screen.getByText(/THE SERVICE IS PROVIDED/)).toBeInTheDocument();
      expect(screen.getByText(/TO THE FULLEST EXTENT PERMITTED BY LAW,.*OUR TOTAL LIABILITY/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses proper container classes for responsive layout', () => {
      const { container } = render(<TermsOfService />);
      
      const mainContainer = container.querySelector('div.container.mx-auto.px-4.py-8.max-w-4xl');
      expect(mainContainer).toBeInTheDocument();
    });

    it('applies proper spacing between sections', () => {
      const { container } = render(<TermsOfService />);
      
      // Look for the space-y-8 class that provides consistent spacing
      const sectionsContainer = container.querySelector('div.space-y-8');
      expect(sectionsContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<TermsOfService />);
      
      // Main heading should be h1
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Terms of Service');
      
      // Section headings should be properly structured
      const sectionHeadings = screen.getAllByRole('heading');
      expect(sectionHeadings.length).toBeGreaterThan(1);
    });

    it('includes aria-labels and proper link text', () => {
      render(<TermsOfService />);
      
      const backLink = screen.getByRole('link', { name: /back to dashboard/i });
      expect(backLink).toBeInTheDocument();
    });
  });

  describe('Card Layout', () => {
    it('renders content in card components', () => {
      render(<TermsOfService />);
      
      // Each section should be in a card format - check for multiple cards
      const acceptanceSection = screen.getByText('Acceptance of Terms').closest('div');
      expect(acceptanceSection).toBeInTheDocument();
      
      const descriptionSection = screen.getByText('Description of Service').closest('div');
      expect(descriptionSection).toBeInTheDocument();
    });
  });
});