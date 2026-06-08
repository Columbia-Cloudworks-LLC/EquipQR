import { Link } from 'react-router-dom';
import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyRightsSection() {
  return (
    <LegalPolicySection title="10. Your Rights and Choices">
            <p>
              Depending on your jurisdiction, you may have some or all of the following rights
              regarding your personal information:
            </p>
            <PolicyList
              items={[
                { label: 'Access:', content: 'Request a copy of the personal data we hold about you.' },
                {
                  label: 'Correction:',
                  content:
                    'Request that we correct inaccurate or incomplete personal data. You can update your display name directly in your profile settings.',
                },
                {
                  label: 'Deletion:',
                  content:
                    'Request that we delete your personal data, subject to legal retention requirements.',
                },
                {
                  label: 'Data portability:',
                  content: 'Request your data in a structured, machine-readable format.',
                },
                {
                  label: 'Restriction:',
                  content:
                    'Request that we restrict processing of your personal data under certain conditions.',
                },
                {
                  label: 'Objection:',
                  content:
                    'Object to our processing of your personal data where we rely on legitimate interests.',
                },
              ]}
            />

            <h3>Controls Available to You</h3>
            <PolicyList
              items={[
                {
                  label: 'Email privacy:',
                  content:
                    'You can toggle your email visibility in your profile settings. When enabled, other organization members (except owners and administrators) will not see your email address.',
                },
                {
                  label: 'Push notifications:',
                  content:
                    'You can opt in or out of push notifications at any time through your notification preferences or your browser settings.',
                },
                {
                  label: 'Notification preferences:',
                  content:
                    'You can customize which categories of notifications you receive (work orders, equipment alerts, invitations, etc.).',
                },
              ]}
            />

            <h3>Controls Available to Organization Administrators</h3>
            <PolicyList
              items={[
                {
                  label: 'GPS location collection:',
                  content:
                    'Organization administrators can enable or disable GPS location collection from QR code scans at any time via organization settings. When disabled, no location data is captured from scans.',
                },
                {
                  label: 'Optional integrations:',
                  content:
                    'Organization administrators control whether QuickBooks Online and Google Workspace integrations are connected or disconnected.',
                },
              ]}
            />

            <h3>Data Processing Agreements</h3>
            <p>
              If your organization requires a Data Processing Agreement (DPA) for regulatory
              compliance (e.g., GDPR), you can request our standard DPA at any time by contacting
              us. We will provide it for review and execution.
            </p>

            <p>
              To exercise any of these rights, please contact us using the information in Section 14
              or via our{' '}
              <Link to="/privacy-request" className="underline">
                privacy request form
              </Link>
              . We will respond to verified requests within 45 calendar days as required by
              applicable law. If we need additional time, we will notify you before the initial
              deadline.
            </p>
            <p>
              If you are a California resident, please see Section 10A below for additional
              rights available to you under the California Consumer Privacy Act (CCPA) and
              the California Privacy Rights Act (CPRA).
            </p></LegalPolicySection>
  );
}
