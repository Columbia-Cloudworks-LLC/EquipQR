import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

/**
 * Global first-visit cookies / browser-storage notice with Accept and Reject.
 * Mounted from AppProviders so it covers landing, auth, public QR, and dashboard.
 */
export function CookieConsentBanner() {
  const { needsConsent, accept, reject } = useCookieConsent();

  if (!needsConsent) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[var(--z-cookie-banner)] border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/90"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Cookies and browser storage</p>
          <p>
            EquipQR uses cookies and browser storage for sign-in, security, and optional preferences
            such as sidebar layout. We do not use advertising or third-party tracking cookies. See{' '}
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
          <Button type="button" variant="outline" onClick={reject} className="min-h-[44px]">
            Reject
          </Button>
          <Button type="button" onClick={accept} className="min-h-[44px]">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
