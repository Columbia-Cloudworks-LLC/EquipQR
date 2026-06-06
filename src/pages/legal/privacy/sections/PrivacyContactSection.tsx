import { ExternalLink } from '@/components/ui/external-link';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyContactSection() {
  return (
    <LegalPolicySection title="14. Contact Us">
            <p>
              If you have any questions about this Privacy Policy, want to exercise your data rights,
              or have concerns about our data practices, please contact us:
            </p>
            <ul>
              <li>
                <strong>Email:</strong>{' '}
                <ExternalLink href="mailto:nicholas.king@columbiacloudworks.com" className="hover:text-foreground">
                  nicholas.king@columbiacloudworks.com
                </ExternalLink>
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <ExternalLink href="https://equipqr.app" className="hover:text-foreground">
                  equipqr.app
                </ExternalLink>
              </li>
              <li>
                <strong>Company:</strong>{' '}
                <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                  Columbia Cloudworks LLC
                </ExternalLink>
              </li>
              <li>
                <strong>Address:</strong> Contact us for business address information
              </li>
            </ul>
            <p>
              We aim to respond to all privacy-related inquiries within 45 calendar days.
            </p></LegalPolicySection>
  );
}
