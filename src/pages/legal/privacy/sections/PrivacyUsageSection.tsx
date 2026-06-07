import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyUsageSection() {
  return (
    <LegalPolicySection title="6. How We Use Your Information">
            <p>
              We use the information described above for the following specific purposes:
            </p>
            <PolicyList
              items={[
                {
                  label: 'Providing the Service:',
                  content: (
                    <>
                      To operate, maintain, and deliver the core EquipQR features &mdash; equipment
                      tracking, work order management, team collaboration, inventory management, QR code
                      scanning, and fleet map visualization.
                    </>
                  ),
                },
                {
                  label: 'Authentication and access control:',
                  content:
                    'To verify your identity, manage your session, and enforce role-based permissions within your organization and teams.',
                },
                {
                  label: 'Notifications:',
                  content:
                    'To send you in-app notifications, push notifications (if you opted in), and transactional emails (such as organization invitations) about activity relevant to you.',
                },
                {
                  label: 'Integration fulfillment:',
                  content:
                    'To export data to QuickBooks or Google Workspace when your organization has explicitly connected those services.',
                },
                {
                  label: 'Bug resolution:',
                  content:
                    'To diagnose and resolve issues you report through the in-app bug reporting feature.',
                },
                {
                  label: 'Compliance and audit:',
                  content:
                    'To maintain the immutable audit trail that helps your organization meet regulatory requirements (e.g., OSHA, DOT, ISO).',
                },
                {
                  label: 'Security and abuse prevention:',
                  content:
                    'To detect and prevent unauthorized access, bot abuse (via hCaptcha), and fraudulent activity.',
                },
                {
                  label: 'Service improvement:',
                  content:
                    'To analyze aggregate, de-identified usage patterns to improve platform reliability and user experience. We do not use third-party analytics services.',
                },
                {
                  label: 'Legal obligations:',
                  content:
                    'To comply with applicable laws, regulations, legal processes, or enforceable governmental requests.',
                },
              ]}
            /></LegalPolicySection>
  );
}
