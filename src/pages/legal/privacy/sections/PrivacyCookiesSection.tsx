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
              EquipQR uses minimal browser storage for application functionality. We do not use
              advertising pixels or browser fingerprinting techniques, and we do not use any
              third-party tracking cookies unless you opt in to usage analytics and diagnostic
              session replay (described below).
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
                  label: <code>equipqr_telemetry_consent</code>,
                  content: (
                    <>
                      &mdash; Stores whether you opted in to or out of usage analytics and diagnostic session
                      replay (strictly necessary for remembering that choice).
                    </>
                  ),
                },
                {
                  label: <code>equipqr_telemetry_consent_scope</code>,
                  content: (
                    <>
                      &mdash; Records which optional tools (Google Analytics, Microsoft Clarity) your opt-in
                      covered, so we ask again before turning on a tool you have not agreed to.
                    </>
                  ),
                },
                {
                  label: <code>gbp_review_prompt_dismissed_at</code>,
                  content: (
                    <>
                      &mdash; Records when we asked organization owners and admins for a Google review, so the
                      request is shown only once. Contains a date only and is never sent anywhere.
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
                  label: <code>equipqr_admin_grants_*</code>,
                  content: (
                    <>
                      &mdash; Throttles redundant permission grant RPCs after sign-in. Strictly necessary for
                      reliable auth performance (not advertising or tracking). Written regardless of Accept/Reject.
                    </>
                  ),
                },
                {
                  label: 'Editor draft backups',
                  content: (
                    <>
                      &mdash; Short-lived backups of in-progress PM checklists and template editors so a refresh
                      does not lose work. Strictly necessary for data integrity while editing.
                    </>
                  ),
                },
              ]}
            />
            <p>
              None of this data is sent to any server or third party. It remains in your browser
              and can be cleared at any time through your browser settings. Choosing Reject clears
              optional UI preference keys EquipQR controls and stops writing them until you Accept;
              strictly necessary keys listed above remain available.
            </p>

            <h3>Usage Analytics (Optional)</h3>
            <p>
              We utilize Google Analytics 4 for strictly opt-in, aggregate visitor analytics, such as
              which searches, referrals, and campaigns bring people to EquipQR. Record IDs and access
              tokens are removed from page addresses before anything is sent, and advertising features
              are turned off.
            </p>
            <p>
              Google Analytics shares the same choice as diagnostic session replay below: it never loads
              unless you choose &quot;Accept All (Help Us Improve)&quot; on the cookies notice or turn on
              &quot;Help improve EquipQR with usage analytics&quot; in Settings. When active, it sets the
              first-party cookies <code>_ga</code> and <code>_ga_&lt;ID&gt;</code> (up to two years) to
              tell visits apart; they are removed when you opt out. See Section 4.12 for what is sent to
              Google.
            </p>

            <h3>Diagnostic Session Replay (Optional)</h3>
            <p>
              We utilize Microsoft Clarity for strictly opt-in diagnostic usage metrics, heatmaps, and
              session replays to resolve interface friction and bugs. Sensitive text and form fields
              are masked at the browser level.
            </p>
            <p>
              Clarity never loads unless you choose &quot;Accept All (Help Us Improve)&quot; on the cookies
              notice or turn on &quot;Help improve EquipQR with usage analytics&quot; in Settings.
              Choosing &quot;Essential Only&quot; or turning the setting off stores your opt-out and stops
              Clarity. When active, Clarity sets the first-party cookies <code>_clck</code> (up to one
              year) and <code>_clsk</code> (one day) to group page views into a session; they are removed
              when you opt out. See Section 4.11 for what is sent to Microsoft.
            </p>

            <h3>Session Storage</h3>
            <p>
              We use sessionStorage for two purposes. First, storing a pending redirect URL when a QR
              code scan requires you to log in first; this is strictly necessary for that sign-in flow.
              Second, when you arrive from a tagged link (for example, our Google Business Profile), we
              keep the campaign tags (<code>utm_source</code>, <code>utm_medium</code>,{' '}
              <code>utm_campaign</code>) under <code>equipqr:landing-utm</code> so they can be attached
              to your first page view if you opt in to usage analytics. These tags never leave your
              browser unless you opt in. Both values are cleared after use or when the browser tab is
              closed.
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
