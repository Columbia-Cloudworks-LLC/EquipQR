import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacySharingSection() {
  return (
    <LegalPolicySection title="7. How We Share Your Information">
            <p>
              We do not sell your personal information. We share data only in the following
              circumstances:
            </p>
            <PolicyList
              items={[
                {
                  label: 'Subprocessors listed in Section 4:',
                  content:
                    'We share data with the third-party service providers described above, strictly for the purposes stated. Each provider processes data only as necessary to deliver their specific service to EquipQR.',
                },
                {
                  label: 'Within your organization:',
                  content:
                    'Other members of your organization can see your name, role, and (unless you have enabled the email privacy setting) your email address. Organization owners and administrators can always see member email addresses for management purposes.',
                },
                {
                  label: <>Optional integrations (with your organization&apos;s consent):</>,
                  content: (
                    <>
                      When an organization administrator connects QuickBooks Online or Google Workspace,
                      relevant organization data is shared with those services as described in Section 4.
                      Individual users cannot trigger these integrations.
                    </>
                  ),
                },
                {
                  label: 'Legal compliance:',
                  content:
                    'We may disclose your information if required by law or in response to a valid legal request, such as a subpoena, court order, or government inquiry.',
                },
                {
                  label: 'Business transfers:',
                  content:
                    'In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify affected users before their data is subject to a different privacy policy.',
                },
                {
                  label: 'With your consent:',
                  content:
                    'We may share your information with third parties when we have your explicit consent to do so.',
                },
              ]}
            />
            <p>
              We do not share data with advertising networks, data brokers, or any parties for
              marketing purposes.
            </p></LegalPolicySection>
  );
}
