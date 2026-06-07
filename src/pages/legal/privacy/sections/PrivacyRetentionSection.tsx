import { Link } from 'react-router-dom';
import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyRetentionSection() {
  return (
    <LegalPolicySection title="9. Data Retention, Export, and Deletion">
            <p>
              We retain your information for the specific periods described in Section 10A
              (Retention Periods). In general, data is kept for as long as necessary to fulfill
              the purposes described in this Privacy Policy and to comply with our legal
              obligations.
            </p>
            <PolicyList
              items={[
                {
                  label: 'Active accounts:',
                  content: (
                    <>
                      Your data is retained for the duration of your account and your organization&apos;s
                      active subscription.
                    </>
                  ),
                },
                {
                  label: 'Post-termination export window:',
                  content: (
                    <>
                      Upon termination or expiration of your subscription, you may export your Customer
                      Data for <strong>30 days</strong>. After that window, we may delete or de-identify
                      Customer Data from active systems.
                    </>
                  ),
                },
                {
                  label: 'Audit trail:',
                  content:
                    'Audit log records may be retained for longer periods as required by applicable regulations or for legitimate business record-keeping.',
                },
                {
                  label: 'Backup retention:',
                  content: (
                    <>
                      Database backups managed by Supabase may retain data for a limited period per
                      Supabase&apos;s infrastructure policies, after which they are automatically purged.
                    </>
                  ),
                },
                {
                  label: 'Legal holds:',
                  content:
                    'We may retain data beyond the normal retention period where required by law or for the establishment, exercise, or defense of legal claims.',
                },
              ]}
            />
            <p>
              For full details on data export and deletion procedures, see the{' '}
              <Link to="/terms-of-service" className="underline">
                Terms of Service
              </Link>
              .
            </p></LegalPolicySection>
  );
}
