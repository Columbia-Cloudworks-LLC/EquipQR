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
      // Should show written date format: February 10, 2026
      expect(screen.getByText(/February \d{1,2}, \d{4}/)).toBeInTheDocument();
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
      
      expect(screen.getByText('1. Introduction')).toBeInTheDocument();
      expect(screen.getByText(/is committed to protecting the privacy of every person/)).toBeInTheDocument();
    });

    it('displays information we collect - individual level section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/2\. Information We Collect.*Individual User Level/)).toBeInTheDocument();
      expect(screen.getByText(/When you create an account or interact with EquipQR/)).toBeInTheDocument();
    });

    it('displays information we collect - organization level section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/3\. Information We Collect.*Organization Level/)).toBeInTheDocument();
      expect(screen.getByText(/Organizations that use EquipQR store business data/)).toBeInTheDocument();
    });

    it('displays how we use your information section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('6. How We Use Your Information')).toBeInTheDocument();
      expect(screen.getByText(/We use the information described above for the following specific purposes/)).toBeInTheDocument();
    });

    it('displays how we share your information section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('7. How We Share Your Information')).toBeInTheDocument();
      expect(screen.getByText(/We do not sell your personal information/)).toBeInTheDocument();
    });

    it('displays data security section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('8. Data Security')).toBeInTheDocument();
      expect(screen.getByText(/We implement multiple layers of technical and organizational security measures/)).toBeInTheDocument();
    });

    it('displays data retention section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Data Retention/i)).toBeInTheDocument();
      expect(screen.getByText(/We retain your information for as long as necessary/)).toBeInTheDocument();
    });

    it('displays your rights section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/10\. Your Rights and Choices/)).toBeInTheDocument();
      expect(screen.getByText(/Depending on your jurisdiction, you may have some or all of the following rights/)).toBeInTheDocument();
    });

    it('displays changes to privacy policy section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('13. Changes to This Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText(/We may update this Privacy Policy from time to time/)).toBeInTheDocument();
    });

    it('displays contact us section', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('14. Contact Us')).toBeInTheDocument();
      expect(screen.getByText(/If you have any questions about this Privacy Policy/)).toBeInTheDocument();
    });
  });

  describe('Information Types Listed', () => {
    it('lists individual-level data categories', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Account Registration')).toBeInTheDocument();
      expect(screen.getByText(/Full name, email address, and password/)).toBeInTheDocument();
    });

    it('lists organization-level data categories', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Equipment Records')).toBeInTheDocument();
      expect(screen.getByText(/Equipment name, manufacturer, model, serial number/)).toBeInTheDocument();
    });

    it('lists work order data', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText(/Title, description, priority, status/)).toBeInTheDocument();
    });

    it('lists QR code scan data', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('QR Code Scans')).toBeInTheDocument();
      expect(screen.getByText(/scan timestamp and your user identity/)).toBeInTheDocument();
    });

    it('lists cookies and local storage information', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('5. Cookies, Local Storage, and Session Data')).toBeInTheDocument();
      expect(screen.getByText(/We do not use any third-party tracking cookies/)).toBeInTheDocument();
    });
  });

  describe('Information Usage Purposes', () => {
    it('lists how information is used', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Providing the Service:/)).toBeInTheDocument();
      expect(screen.getByText(/Authentication and access control:/)).toBeInTheDocument();
      expect(screen.getByText(/Notifications:/)).toBeInTheDocument();
      expect(screen.getByText(/Integration fulfillment:/)).toBeInTheDocument();
      expect(screen.getByText(/Bug resolution:/)).toBeInTheDocument();
      expect(screen.getByText(/Compliance and audit:/)).toBeInTheDocument();
      expect(screen.getByText(/Security and abuse prevention:/)).toBeInTheDocument();
    });
  });

  describe('Information Sharing Scenarios', () => {
    it('lists subprocessors sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Subprocessors listed in Section 4:/)).toBeInTheDocument();
      expect(screen.getByText(/third-party service providers described above/)).toBeInTheDocument();
    });

    it('lists within organization sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Within your organization:/)).toBeInTheDocument();
      expect(screen.getByText(/Other members of your organization can see your name/)).toBeInTheDocument();
    });

    it('lists legal compliance sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Legal compliance:/)).toBeInTheDocument();
      expect(screen.getByText(/required by law or in response to a valid legal request/)).toBeInTheDocument();
    });

    it('lists business transfers sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Business transfers:/)).toBeInTheDocument();
      expect(screen.getByText(/merger, acquisition, or sale of all or a portion/)).toBeInTheDocument();
    });

    it('lists consent-based sharing', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/With your consent:/)).toBeInTheDocument();
      expect(screen.getByText(/when we have your explicit consent to do so/)).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('includes Columbia Cloudworks links with correct attributes', () => {
      render(<PrivacyPolicy />);
      
      const cloudWorksLinks = screen.getAllByText('Columbia Cloudworks LLC');
      
      cloudWorksLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', 'https://columbiacloudworks.com');
        expect(link.closest('a')).toHaveAttribute('target', '_blank');
        expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('includes correct contact information', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/nicholas\.king@columbiacloudworks\.com/)).toBeInTheDocument();
      expect(screen.getAllByText('equipqr.app').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Contact us for business address information/)).toBeInTheDocument();
    });
  });

  describe('Security and Rights Content', () => {
    it('mentions security measures', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Encryption in transit:/)).toBeInTheDocument();
      expect(screen.getByText(/Encryption at rest:/)).toBeInTheDocument();
      expect(screen.getByText(/No method of electronic transmission or storage is 100% secure/)).toBeInTheDocument();
    });

    it('describes user rights', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/Access:/)).toBeInTheDocument();
      expect(screen.getByText(/Correction:/)).toBeInTheDocument();
      expect(screen.getByText(/Deletion:/)).toBeInTheDocument();
      expect(screen.getByText(/Data portability:/)).toBeInTheDocument();
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
      expect(screen.getByText('1. Introduction').closest('[class*="space-y"]')).toBeInTheDocument();
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
      
      // Check for key privacy policy sections (numbered headings)
      expect(screen.getByText('1. Introduction')).toBeInTheDocument();
      expect(screen.getByText(/2\. Information We Collect.*Individual User Level/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Information We Collect.*Organization Level/)).toBeInTheDocument();
      expect(screen.getByText('6. How We Use Your Information')).toBeInTheDocument();
      expect(screen.getByText('7. How We Share Your Information')).toBeInTheDocument();
      expect(screen.getByText('8. Data Security')).toBeInTheDocument();
      expect(screen.getByText(/Data Retention/i)).toBeInTheDocument();
      expect(screen.getByText(/10\. Your Rights and Choices/)).toBeInTheDocument();
      expect(screen.getByText('13. Changes to This Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('14. Contact Us')).toBeInTheDocument();
    });

    it('provides comprehensive data handling information', () => {
      render(<PrivacyPolicy />);
      
      // Should mention various aspects of data handling
      expect(screen.getByText(/fleet equipment management platform/)).toBeInTheDocument();
      expect(screen.getByText(/We use the information described above/)).toBeInTheDocument();
      expect(screen.getByText(/We do not sell your personal information/)).toBeInTheDocument();
      expect(screen.getByText(/We share data only in the following circumstances/)).toBeInTheDocument();
    });
  });

  describe('External Service Providers', () => {
    it('lists all subprocessors', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText('4. External Service Providers (Subprocessors)')).toBeInTheDocument();
      expect(screen.getByText(/4\.1 Supabase/)).toBeInTheDocument();
      expect(screen.getByText(/4\.2 Google Maps Platform/)).toBeInTheDocument();
      expect(screen.getByText(/4\.3 hCaptcha/)).toBeInTheDocument();
      expect(screen.getByText(/4\.4 Resend/)).toBeInTheDocument();
      expect(screen.getByText(/4\.5 Vercel/)).toBeInTheDocument();
    });

    it('lists optional integrations', () => {
      render(<PrivacyPolicy />);
      
      expect(screen.getByText(/4\.7 QuickBooks Online.*Optional Integration/)).toBeInTheDocument();
      expect(screen.getByText(/4\.8 Google Workspace.*Optional Integration/)).toBeInTheDocument();
    });
  });
});
