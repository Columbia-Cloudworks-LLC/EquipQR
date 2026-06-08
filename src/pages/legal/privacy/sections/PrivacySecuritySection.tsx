import { Link } from 'react-router-dom';
import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacySecuritySection() {
  return (
    <LegalPolicySection title="8. Data Security">
            <p>
              We implement multiple layers of technical and organizational security measures to
              protect your data:
            </p>
            <PolicyList
              items={[
                {
                  label: 'Encryption in transit:',
                  content:
                    'All data transmitted between your browser and EquipQR is encrypted using TLS (HTTPS). We enforce HTTP Strict Transport Security (HSTS) with a one-year max-age, including subdomains, with preload.',
                },
                {
                  label: 'Encryption at rest:',
                  content:
                    'All database data is encrypted at rest by Supabase-managed PostgreSQL (AES-256). Uploaded files in Supabase Storage are similarly encrypted at rest.',
                },
                {
                  label: 'OAuth token encryption:',
                  content:
                    'QuickBooks and Google Workspace OAuth tokens are additionally encrypted using AES with a dedicated server-side encryption key before storage in the database.',
                },
                {
                  label: 'Multi-tenant isolation:',
                  content: (
                    <>
                      PostgreSQL Row Level Security (RLS) policies enforce strict data isolation between
                      organizations at the database level. Every query is automatically scoped to the
                      requesting user&apos;s organization.
                    </>
                  ),
                },
                {
                  label: 'Content Security Policy (CSP):',
                  content:
                    'Strict CSP headers limit which external resources the application can load, mitigating cross-site scripting (XSS) attacks.',
                },
                {
                  label: 'Additional HTTP security headers:',
                  content: (
                    <>
                      <code>X-Frame-Options: DENY</code> (prevents clickjacking),{' '}
                      <code>X-Content-Type-Options: nosniff</code>,{' '}
                      <code>Referrer-Policy: strict-origin-when-cross-origin</code>, and a{' '}
                      <code>Permissions-Policy</code> that allows camera access only within EquipQR&apos;s
                      own application pages (same origin) for features such as in-app QR scanning, while
                      keeping microphone access disabled at the policy level.
                    </>
                  ),
                },
                {
                  label: 'Bot protection:',
                  content: 'hCaptcha protects signup forms against automated abuse.',
                },
                {
                  label: 'Rate limiting:',
                  content:
                    'Sensitive operations (geocoding, bug report submission, data exports) are rate-limited to prevent abuse.',
                },
                {
                  label: 'Input validation:',
                  content:
                    'All user input is validated on both the client (using Zod schemas) and the server to prevent injection and malformed data.',
                },
                {
                  label: 'PII redaction:',
                  content:
                    'Bug reports sent to GitHub are automatically scanned and have email addresses and phone numbers redacted before submission.',
                },
                {
                  label: 'Webhook verification:',
                  content:
                    'Inbound webhooks (e.g., from GitHub) are verified using HMAC-SHA256 signatures to ensure authenticity.',
                },
                {
                  label: 'Regular security audits:',
                  content:
                    'We run automated dependency vulnerability scanning (npm audit) and static code analysis (CodeQL) as part of our continuous integration pipeline.',
                },
              ]}
            />
            <p>
              No method of electronic transmission or storage is 100% secure. While we strive to
              protect your information, we cannot guarantee absolute security. For more on our
              security posture and availability commitments, see the{' '}
              <Link to="/terms-of-service" className="underline">
                Terms of Service
              </Link>
              .
            </p></LegalPolicySection>
  );
}
