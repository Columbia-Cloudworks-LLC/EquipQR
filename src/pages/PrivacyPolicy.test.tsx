import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import PrivacyPolicy from './PrivacyPolicy';

vi.mock('react-router-dom', async () => {
  const { createReactRouterDomTestMock } = await import(
    '@vitest-harness/utils/react-router-dom-test-mock'
  );
  return createReactRouterDomTestMock();
});

describe('PrivacyPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shell, heading hierarchy, and navigation', () => {
    render(<PrivacyPolicy />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Privacy Policy');
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/March \d{1,2}, \d{4}/)).toBeInTheDocument();
    expect(screen.getByText(/March 29, 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(1);
    expect(screen.getByText('Privacy Policy').closest('[class*="container"]')).toBeInTheDocument();
    expect(screen.getByText('1. Introduction').closest('[class*="space-y"]')).toBeInTheDocument();
  });

  it('covers numbered policy sections and data-handling promises', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
    expect(screen.getByText(/is committed to protecting the privacy of every person/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Information We Collect.*Individual User Level/)).toBeInTheDocument();
    expect(screen.getByText(/When you create an account or interact with EquipQR/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Information We Collect.*Organization Level/)).toBeInTheDocument();
    expect(screen.getByText(/Organizations that use EquipQR store business data/)).toBeInTheDocument();
    expect(screen.getByText('5. Cookies, Local Storage, and Session Data')).toBeInTheDocument();
    expect(screen.getByText(/We do not use any third-party tracking cookies/)).toBeInTheDocument();
    expect(screen.getByText('6. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText(/We use the information described above for the following specific purposes/)).toBeInTheDocument();
    expect(screen.getByText('7. How We Share Your Information')).toBeInTheDocument();
    expect(screen.getAllByText(/We do not sell your personal information/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/We share data only in the following circumstances/)).toBeInTheDocument();
    expect(screen.getByText('8. Data Security')).toBeInTheDocument();
    expect(screen.getByText(/We implement multiple layers of technical and organizational security measures/)).toBeInTheDocument();
    expect(screen.getByText(/Data Retention/i)).toBeInTheDocument();
    expect(screen.getByText(/We retain your information for the specific periods/)).toBeInTheDocument();
    expect(screen.getByText(/10\. Your Rights and Choices/)).toBeInTheDocument();
    expect(screen.getByText(/Depending on your jurisdiction, you may have some or all of the following rights/)).toBeInTheDocument();
    expect(screen.getByText('13. Changes to This Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText(/We may update this Privacy Policy from time to time/)).toBeInTheDocument();
    expect(screen.getByText('14. Contact Us')).toBeInTheDocument();
    expect(screen.getByText(/If you have any questions about this Privacy Policy/)).toBeInTheDocument();
    expect(screen.getByText(/fleet equipment management platform/)).toBeInTheDocument();
  });

  it('lists collected data categories and usage purposes', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByText('Account Registration')).toBeInTheDocument();
    expect(screen.getByText(/Full name, email address, and password/)).toBeInTheDocument();
    expect(screen.getByText('Equipment Records')).toBeInTheDocument();
    expect(screen.getByText(/Equipment name, manufacturer, model, serial number/)).toBeInTheDocument();
    expect(screen.getByText('Work Orders')).toBeInTheDocument();
    expect(screen.getByText(/Title, description, priority, status/)).toBeInTheDocument();
    expect(screen.getByText('QR Code Scans')).toBeInTheDocument();
    expect(screen.getByText(/scan timestamp and your user identity/)).toBeInTheDocument();
    expect(screen.getByText(/Providing the Service:/)).toBeInTheDocument();
    expect(screen.getByText(/Authentication and access control:/)).toBeInTheDocument();
    expect(screen.getByText(/Notifications:/)).toBeInTheDocument();
    expect(screen.getByText(/Integration fulfillment:/)).toBeInTheDocument();
    expect(screen.getByText(/Bug resolution:/)).toBeInTheDocument();
    expect(screen.getByText(/Compliance and audit:/)).toBeInTheDocument();
    expect(screen.getByText(/Security and abuse prevention:/)).toBeInTheDocument();
  });

  it('lists sharing scenarios, security measures, and user rights', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByText(/Subprocessors listed in Section 4:/)).toBeInTheDocument();
    expect(screen.getByText(/third-party service providers described above/)).toBeInTheDocument();
    expect(screen.getByText(/Within your organization:/)).toBeInTheDocument();
    expect(screen.getByText(/Other members of your organization can see your name/)).toBeInTheDocument();
    expect(screen.getByText(/Legal compliance:/)).toBeInTheDocument();
    expect(screen.getByText(/required by law or in response to a valid legal request/)).toBeInTheDocument();
    expect(screen.getByText(/Business transfers:/)).toBeInTheDocument();
    expect(screen.getByText(/merger, acquisition, or sale of all or a portion/)).toBeInTheDocument();
    expect(screen.getByText(/With your consent:/)).toBeInTheDocument();
    expect(screen.getByText(/when we have your explicit consent to do so/)).toBeInTheDocument();
    expect(screen.getByText(/Encryption in transit:/)).toBeInTheDocument();
    expect(screen.getByText(/Encryption at rest:/)).toBeInTheDocument();
    expect(screen.getByText(/No method of electronic transmission or storage is 100% secure/)).toBeInTheDocument();
    expect(screen.getAllByText(/Access:/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Correction:/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Deletion:/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Data portability:/)).toBeInTheDocument();
  });

  it('lists subprocessors, optional integrations, and contact links', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByText('4. External Service Providers (Subprocessors)')).toBeInTheDocument();
    expect(screen.getByText(/4\.1 Supabase/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2 Google Maps Platform/)).toBeInTheDocument();
    expect(screen.getByText(/4\.3 hCaptcha/)).toBeInTheDocument();
    expect(screen.getByText(/4\.4 Resend/)).toBeInTheDocument();
    expect(screen.getByText(/4\.5 Vercel/)).toBeInTheDocument();
    expect(screen.getByText(/4\.7 QuickBooks Online.*Optional Integration/)).toBeInTheDocument();
    expect(screen.getByText(/4\.8 Google Workspace.*Optional Integration/)).toBeInTheDocument();

    const cloudWorksLinks = screen.getAllByText('Columbia Cloudworks LLC');
    cloudWorksLinks.forEach((link) => {
      expect(link.closest('a')).toHaveAttribute('href', 'https://columbiacloudworks.com');
      expect(link.closest('a')).toHaveAttribute('target', '_blank');
      expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });
    expect(screen.getByText(/nicholas\.king@columbiacloudworks\.com/)).toBeInTheDocument();
    expect(screen.getAllByText('equipqr.app').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Contact us for business address information/)).toBeInTheDocument();
  });

  it('covers California privacy rights tables and privacy-request link', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByText(/10A\. Your California Privacy Rights/)).toBeInTheDocument();
    expect(screen.getByText('Categories of Personal Information Collected')).toBeInTheDocument();
    expect(screen.getByText('Identifiers')).toBeInTheDocument();
    expect(screen.getByText('Geolocation Data')).toBeInTheDocument();
    expect(
      screen.getByText(/We do not sell your personal information\. We do not share your personal/),
    ).toBeInTheDocument();
    expect(screen.getByText('Retention Periods')).toBeInTheDocument();
    expect(screen.getAllByText(/30 days/).length).toBeGreaterThanOrEqual(1);
    const privacyRequestLink = screen.getByText('equipqr.app/privacy-request');
    expect(privacyRequestLink.closest('a')).toHaveAttribute('href', '/privacy-request');
  });
});
