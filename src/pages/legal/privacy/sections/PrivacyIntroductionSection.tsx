import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyIntroductionSection() {
  return (
    <LegalPolicySection title="1. Introduction">
      <p>
        EquipQR™ (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), developed and operated by{' '}
        <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
          Columbia Cloudworks LLC
        </ExternalLink>
        , is committed to protecting the privacy of every person and organization that uses our fleet
        equipment management platform. This Privacy Policy explains in plain language what information
        we collect, why we collect it, which external service providers process it, how we protect it,
        and what rights you have.
      </p>
      <p>
        This policy applies to all users of the EquipQR web application located at{' '}
        <ExternalLink href="https://equipqr.app" className="hover:text-foreground">
          equipqr.app
        </ExternalLink>
        , including the QR-code scanning experience, all API endpoints, and any associated mobile or
        progressive web app functionality.
      </p>
      <p>
        Your use of the Service is also governed by our{' '}
        <Link to="/terms-of-service" className="underline">
          Terms of Service
        </Link>
        . Capitalized terms not defined in this policy have the meanings given in the Terms.
      </p>
    </LegalPolicySection>
  );
}
