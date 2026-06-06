import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { CcpaRightsList } from '@/components/legal/CcpaRightsList';
import { CcpaPersonalInfoCategoriesTable, CcpaRetentionPeriodsTable } from '@/components/legal/CcpaPrivacyTables';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyCaliforniaSection() {
  return (
    <LegalPolicySection title="10A. Your California Privacy Rights (CCPA/CPRA)">
      <p>
        This section applies to California residents and supplements the rest of this Privacy Policy
        with disclosures required by the California Consumer Privacy Act of 2018 and the California
        Privacy Rights Act of 2020 (together, &quot;CCPA/CPRA&quot;).
      </p>

      <h3>Categories of Personal Information Collected</h3>
      <p>
        In the preceding 12 months, we have collected the following categories of personal
        information from consumers:
      </p>
      <CcpaPersonalInfoCategoriesTable />

      <h3>Categories of Sensitive Personal Information</h3>
      <p>
        We collect two categories of information that qualify as Sensitive Personal Information under
        CPRA:
      </p>
      <ul>
        <li>
          <strong>Precise geolocation:</strong> GPS coordinates captured during QR code scans, only
          when an organization administrator has explicitly enabled location collection. This feature
          is off by default.
        </li>
        <li>
          <strong>Account login credentials:</strong> Email and password managed by our authentication
          provider (Supabase Auth). Passwords are cryptographically hashed before storage.
        </li>
      </ul>

      <h3>Sources of Personal Information</h3>
      <ul>
        <li>
          <strong>Directly from you:</strong> Account registration, profile updates, QR code scans,
          bug reports, and notification preferences.
        </li>
        <li>
          <strong>From your organization:</strong> When an organization administrator connects Google
          Workspace, directory user data (names, emails) may be synced into EquipQR.
        </li>
        <li>
          <strong>Automatically:</strong> Browser push subscription endpoints, session tokens, and
          (when enabled) GPS coordinates.
        </li>
      </ul>

      <h3>Business Purposes</h3>
      <p>
        We use each category of personal information for the specific business purposes described in
        Section 6 of this Privacy Policy, including: providing the Service, authentication and access
        control, notifications, integration fulfillment, compliance and audit, and security and abuse
        prevention.
      </p>

      <h3>Retention Periods</h3>
      <CcpaRetentionPeriodsTable />

      <h3>Sale and Sharing of Personal Information</h3>
      <p>
        <strong>
          We do not sell your personal information. We do not share your personal information for
          cross-context behavioral advertising.
        </strong>{' '}
        We have not sold or shared personal information in the preceding 12 months. We do not use or
        disclose Sensitive Personal Information for purposes other than those permitted by CCPA/CPRA.
      </p>

      <h3>Your California Rights</h3>
      <p>As a California resident, you have the following rights under CCPA/CPRA:</p>
      <CcpaRightsList variant="policy" />

      <h3>How to Submit a Request</h3>
      <p>You may submit a privacy request through either of the following methods:</p>
      <ul>
        <li>
          <strong>Web form:</strong>{' '}
          <Link to="/privacy-request" className="underline">
            equipqr.app/privacy-request
          </Link>
        </li>
        <li>
          <strong>Email:</strong>{' '}
          <ExternalLink href="mailto:privacy@equipqr.app" className="hover:text-foreground">
            privacy@equipqr.app
          </ExternalLink>
        </li>
      </ul>
      <p>Authenticated users can also submit requests directly from their account settings.</p>

      <h3>Verification</h3>
      <p>
        We will verify your identity before fulfilling a request. For authenticated users, your active
        session serves as verification. For unauthenticated requests, we will send a verification
        email to the address on file.
      </p>

      <h3>Authorized Agents</h3>
      <p>
        You may designate an authorized agent to submit requests on your behalf. The agent must
        provide written authorization signed by you, and we may contact you directly to verify the
        request.
      </p>

      <h3>Response Timing</h3>
      <p>
        We will respond to verified requests within 45 calendar days. If we need additional time, we
        will notify you before the initial deadline and may take up to 45 additional days (90 days
        total).
      </p>
    </LegalPolicySection>
  );
}
