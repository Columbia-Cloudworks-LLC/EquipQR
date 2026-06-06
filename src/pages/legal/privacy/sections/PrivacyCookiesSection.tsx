import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyCookiesSection() {
  return (
    <LegalPolicySection title="5. Cookies, Local Storage, and Session Data">
            <p>
              EquipQR uses minimal browser storage, exclusively for application functionality. We do
              not use any third-party tracking cookies, advertising pixels, or browser
              fingerprinting techniques.
            </p>

            <h3>Cookies</h3>
            <p>
              We set one functional cookie:
            </p>
            <PolicyList
              items={[
                {
                  label: <code>sidebar:state</code>,
                  content: (
                    <>
                      &mdash; Remembers whether the navigation sidebar is expanded or collapsed. Expires after 7
                      days. This cookie contains no personal information and is not shared with any third party.
                    </>
                  ),
                },
              ]}
            />

            <h3>Local Storage</h3>
            <p>
              We use your browser&apos;s localStorage for application state only:
            </p>
            <PolicyList
              items={[
                {
                  label: 'Organization preference',
                  content: (
                    <>
                      &mdash; Remembers which organization you last selected (if you belong to multiple).
                    </>
                  ),
                },
                {
                  label: 'Dashboard layout',
                  content: <> &mdash; Saves your preferred dashboard card arrangement.</>,
                },
                {
                  label: 'Work timer state',
                  content: (
                    <> &mdash; Persists an in-progress labor timer so it survives page refreshes.</>
                  ),
                },
                {
                  label: 'Admin grant throttling',
                  content: <> &mdash; Prevents redundant permission lookups within a short window.</>,
                },
              ]}
            />
            <p>
              None of this data is sent to any server or third party. It remains in your browser
              and can be cleared at any time through your browser settings.
            </p>

            <h3>Session Storage</h3>
            <p>
              We use sessionStorage for one purpose: storing a pending redirect URL when a QR code
              scan requires you to log in first. This value is cleared automatically after use or
              when the browser tab is closed.
            </p>

            <h3>Authentication Session</h3>
            <p>
              Supabase Auth stores a JWT access token and refresh token in your browser. These
              tokens are used solely to authenticate your requests to EquipQR and are managed
              entirely by the Supabase Auth SDK. They are not accessible to third-party scripts.
            </p></LegalPolicySection>
  );
}
