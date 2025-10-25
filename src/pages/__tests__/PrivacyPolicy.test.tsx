import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import PrivacyPolicy from '../PrivacyPolicy';

// Mock Link from react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>{children}</a>
    )
  };
});

describe('PrivacyPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure', () => {
    it('renders the page without crashing', () => {
      render(<PrivacyPolicy />);
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('displays the main heading', () => {
      render(<PrivacyPolicy />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Privacy Policy');
    });

    it('shows last updated date', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      // Should show date in format: 8/16/2025
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();
    });

    it('includes back to dashboard link', () => {
      render(<PrivacyPolicy />);
      
      const backLink = screen.getByRole('link', { name: /back to dashboard/i });
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('Privacy Policy Sections', () => {
    it('displays introduction section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText(/EquipQR.*is committed to protecting your privacy/)).toBeInTheDocument();
    });

    it('displays information we collect section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Information We Collect')).toBeInTheDocument();
      expect(screen.getByText(/We collect several types of information/)).toBeInTheDocument();
    });

    it('displays how we use your information section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('How We Use Your Information')).toBeInTheDocument();
      expect(screen.getByText(/We use the information we collect for various purposes/)).toBeInTheDocument();
    });

    it('displays how we share your information section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('How We Share Your Information')).toBeInTheDocument();
      expect(screen.getAllByText(/We may share your information with third parties/)[0]).toBeInTheDocument();
    });

    it('displays data security section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Data Security')).toBeInTheDocument();
      expect(screen.getByText(/We take reasonable measures to protect your information/)).toBeInTheDocument();
    });

    it('displays data retention section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Data Retention/i)).toBeInTheDocument();
      expect(screen.getByText(/We retain your information for as long as necessary/)).toBeInTheDocument();
    });

    it('displays your rights section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Your Rights')).toBeInTheDocument();
      expect(screen.getByText(/You have certain rights regarding your information/)).toBeInTheDocument();
    });

    it('displays changes to privacy policy section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Changes to This Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText(/We may update this Privacy Policy from time to time/)).toBeInTheDocument();
    });

    it('displays contact us section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
      expect(screen.getByText(/If you have any questions about this Privacy Policy/)).toBeInTheDocument();
    });
  });

  describe('Information Types Listed', () => {
    it('lists personal information types', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Personal Information:/)).toBeInTheDocument();
      expect(screen.getByText(/name, email address, phone number/)).toBeInTheDocument();
    });

    it('lists equipment data types', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Equipment Data:/)).toBeInTheDocument();
      expect(screen.getByText(/equipment names, models, serial numbers/)).toBeInTheDocument();
    });

    it('lists usage data types', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Usage Data:/)).toBeInTheDocument();
      expect(screen.getByText(/Details of your interactions with our Services/)).toBeInTheDocument();
    });

    it('lists log data types', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Log Data:/)).toBeInTheDocument();
      expect(screen.getByText(/IP address, browser type, operating system/)).toBeInTheDocument();
    });

    it('lists cookies and tracking technologies', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Cookies and Tracking Technologies:/)).toBeInTheDocument();
      expect(screen.getByText(/cookies, web beacons, and similar technologies/)).toBeInTheDocument();
    });
  });

  describe('Information Usage Purposes', () => {
    it('lists how information is used', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/To provide, maintain, and improve our Services/)).toBeInTheDocument();
      expect(screen.getByText(/To personalize your experience/)).toBeInTheDocument();
      expect(screen.getByText(/To process transactions and manage your account/)).toBeInTheDocument();
      expect(screen.getByText(/To communicate with you about updates/)).toBeInTheDocument();
      expect(screen.getByText(/To monitor and analyze usage trends/)).toBeInTheDocument();
      expect(screen.getByText(/To detect, investigate, and prevent fraudulent/)).toBeInTheDocument();
      expect(screen.getByText(/To comply with legal obligations/)).toBeInTheDocument();
    });
  });

  describe('Information Sharing Scenarios', () => {
    it('lists service providers sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Service Providers:/)).toBeInTheDocument();
      expect(screen.getByText(/hosting providers, payment processors, and analytics providers/)).toBeInTheDocument();
    });

    it('lists business partners sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Business Partners:/)).toBeInTheDocument();
      expect(screen.getByText(/business partners who offer products or services/)).toBeInTheDocument();
    });

    it('lists legal compliance sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Legal Compliance:/)).toBeInTheDocument();
      expect(screen.getByText(/required to do so by law or in response to a valid legal request/)).toBeInTheDocument();
    });

    it('lists business transfers sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Business Transfers:/)).toBeInTheDocument();
      expect(screen.getByText(/merger, acquisition, or sale of all or a portion/)).toBeInTheDocument();
    });

    it('lists consent-based sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/With Your Consent:/)).toBeInTheDocument();
      expect(screen.getByText(/when we have your consent to do so/)).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('includes Columbia CloudWorks links with correct attributes', () => {
      render(<PrivacyPolicy />);
      
      const cloudWorksLinks = screen.getAllByText('COLUMBIA CLOUDWORKS LLC');
      
      cloudWorksLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', 'https://columbiacloudworks.com');
        expect(link.closest('a')).toHaveAttribute('target', '_blank');
        expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('includes correct contact information', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/nicholas\.king@columbiacloudworks\.com/)).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/equipqr\.app/)).toBeInTheDocument();
      expect(screen.getByText(/Contact us for business address information/)).toBeInTheDocument();
    });
  });

  describe('Security and Rights Content', () => {
    it('mentions security measures', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/encryption, firewalls, and regular security assessments/)).toBeInTheDocument();
      expect(screen.getByText(/no method of transmission over the Internet.*is completely secure/)).toBeInTheDocument();
    });

    it('describes user rights', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/right to access, correct, or delete your information/)).toBeInTheDocument();
      expect(screen.getByText(/right to object to or restrict certain processing/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses proper container classes for responsive layout', () => {
      render(<PrivacyPolicy />);
      
      // Look for elements with container classes
      expect(screen.getByText('Privacy Policy').closest('[class*="container"]')).toBeInTheDocument();
    });

    it('applies proper spacing between sections', () => {
      render(<PrivacyPolicy />);
      
      // Look for the space-y-8 class that provides consistent spacing
      expect(screen.getByText('Introduction').closest('[class*="space-y"]')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<PrivacyPolicy />);
      
      // Main heading should be h1
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Privacy Policy');
      
      // Section headings should be properly structured
      const sectionHeadings = screen.getAllByRole('heading');
      expect(sectionHeadings.length).toBeGreaterThan(1);
    });

    it('includes proper link accessibility', () => {
      render(<PrivacyPolicy />);
      
      const backLink = screen.getByRole('link', { name: /back to dashboard/i });
      expect(backLink).toBeInTheDocument();
    });
  });

  describe('Content Completeness', () => {
    it('includes all required privacy policy elements', () => {
      render(<PrivacyPolicy />);
      
      // Check for key privacy policy components
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Information We Collect')).toBeInTheDocument();
      expect(screen.getByText('How We Use Your Information')).toBeInTheDocument();
      expect(screen.getByText('How We Share Your Information')).toBeInTheDocument();
      expect(screen.getByText('Data Security')).toBeInTheDocument();
      expect(screen.getByText('Data Retention')).toBeInTheDocument();
      expect(screen.getByText('Your Rights')).toBeInTheDocument();
      expect(screen.getByText('Changes to This Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });

    it('provides comprehensive data handling information', () => {
      render(<PrivacyPolicy />);
      
      // Should mention various aspects of data handling
      expect(screen.getByText(/fleet equipment management platform/)).toBeInTheDocument();
      expect(screen.getByText(/several types of information/)).toBeInTheDocument();
      expect(screen.getByText(/various purposes/)).toBeInTheDocument();
      expect(screen.getByText(/third parties in the following circumstances/)).toBeInTheDocument();
    });
  });
});