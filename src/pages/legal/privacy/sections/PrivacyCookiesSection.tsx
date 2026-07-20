import { PolicyList } from '@/components/legal/PolicyList';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyCookiesSection() {
  return (
    <LegalPolicySection
      title="5. Cookies, Local Storage, and Session Data"
      id="cookies"
      className="scroll-mt-24"
    >
            <p>
              EquipQR uses minimal browser storage, exclusively for application functionality. We do
              not use any third-party tracking cookies, advertising pixels, or browser
              fingerprinting techniques.
            </p>

            <p>
              On your first visit, EquipQR shows a cookies and browser-storage notice with explicit
              Accept and Reject choices. Your choice is stored in localStorage under{' '}
              <code>equipqr:cookie-consent</code> so the notice does not reappear on every page load
              (until you clear site data). Preference cookies and optional UI preferences are written
              only after Accept. Strictly necessary mechanisms (sign-in tokens, QR login redirects,
              offline queues, and the consent preference itself) remain available after Reject so you
              can still use core product flows. Security widgets such as hCaptcha and map surfaces
              may still load when those features are used; they are not advertising trackers.
            </p>

            <h3>Cookies</h3>
            <p>
              We set one functional preference cookie when you Accept:
            </p>
            <PolicyList
              items={[
                {
                  label: <code>sidebar:state</code>,
                  content: (
                    <>
                      &mdash; Remembers whether the navigation sidebar is expanded or collapsed. Expires after 7
                      days. This cookie contains no personal information and is not shared with any third party.
                      It is not written when you Reject cookies.
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
                  label: <code>equipqr:cookie-consent</code>,
                  content: (
                    <>
                      &mdash; Stores your Accept or Reject decision for the cookies notice (strictly necessary
                      for remembering that choice).
                    </>
                  ),
                },
                {
                  label: 'Organization preference',
                  content: (
                    <>
                      &mdash; Remembers which organization you last selected (if you belong to multiple) and
                      carries the org hint from public QR scans into the dashboard. Strictly necessary for
                      correct organization scoping.
                    </>
                  ),
                },
                {
                  label: 'Sanitized session cache',
                  content: (
                    <>
                      &mdash; Short-lived client cache of organization ids/names/roles (no street addresses or
                      map coordinates). Strictly necessary for faster dashboard boot after sign-in.
                    </>
                  ),
                },
                {
                  label: 'Dashboard layout',
                  content: (
                    <> &mdash; Saves your preferred dashboard card arrangement. Written only after Accept.</>
                  ),
                },
                {
                  label: 'Work timer state',
                  content: (
                    <>
                      {' '}
                      &mdash; Persists an in-progress labor timer so it survives page refreshes. Written only
                      after Accept.
                    </>
                  ),
                },
                {
                  label: 'Admin grant throttling',
                  content: (
                    <>
                      {' '}
                      &mdash; Prevents redundant permission lookups within a short window. Written only after
                      Accept.
                    </>
                  ),
                },
              ]}
            />
            <p>
              None of this data is sent to any server or third party. It remains in your browser
              and can be cleared at any time through your browser settings. Choosing Reject clears
              preference keys EquipQR controls and stops writing them until you Accept.
            </p>

            <h3>Session Storage</h3>
            <p>
              We use sessionStorage for one purpose: storing a pending redirect URL when a QR code
              scan requires you to log in first. This value is cleared automatically after use or
              when the browser tab is closed. It is strictly necessary for that sign-in flow.
            </p>

            <h3>Authentication Session</h3>
            <p>
              Supabase Auth stores a JWT access token and refresh token in your browser. These
              tokens are used solely to authenticate your requests to EquipQR and are managed
              entirely by the Supabase Auth SDK. They are not accessible to third-party scripts.
              Authentication storage remains available regardless of Accept or Reject.
            </p></LegalPolicySection>
  );
}
