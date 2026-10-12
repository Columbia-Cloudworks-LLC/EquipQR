import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

/**
 * Global first-visit cookies / browser-storage notice with Accept and Reject.
 * Mounted from AppProviders so it covers landing, auth, public QR, and dashboard.
 */
export function CookieConsentBanner() {
  const { needsConsent, decision, telemetryAvailable, accept, reject } = useCookieConsent();

  if (!needsConsent) return null;

  // Users who already answered the cookie notice are only asked about diagnostics.
  const telemetryOnly = telemetryAvailable && decision !== null;

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-(--z-cookie-banner) border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/90"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {telemetryOnly ? 'Help improve EquipQR' : 'Cookies and browser storage'}
          </p>
          <p>
            {telemetryOnly
              ? null
              : 'EquipQR uses cookies and browser storage for sign-in, security, and optional preferences such as sidebar layout. '}
            {telemetryAvailable
              ? 'With your permission, we also use Microsoft Clarity for masked session replays and heatmaps that help us fix interface problems. It never loads unless you accept, and you can turn it off anytime in Settings. We do not use advertising cookies. See '
              : 'We do not use advertising or third-party tracking cookies. See '}
            <Link
              to="/privacy-policy#cookies"
              className="text-primary underline underline-offset-2"
            >
              Privacy Policy — Cookies, Local Storage, and Session Data
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={reject} className="min-h-11">
            {telemetryAvailable ? 'Essential Only' : 'Reject'}
          </Button>
          <Button type="button" onClick={accept} className="min-h-11">
            {telemetryAvailable ? 'Accept All (Help Us Improve)' : 'Accept'}
          </Button>
        </div>
      </div>
    </section>
  );
}
