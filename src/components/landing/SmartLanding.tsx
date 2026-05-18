import React, { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageSEO } from '@/components/seo/PageSEO';
import { Loader2 } from 'lucide-react';

const Landing = lazy(() => import('@/pages/Landing'));

/**
 * Smart landing page that conditionally renders based on authentication state.
 *
 * - For unauthenticated visitors: Displays the public marketing landing page immediately,
 *   with no dependency on auth resolution. The hero must never be gated on isLoading —
 *   when supabase-js retries a stale token refresh, that loop can take 13–60+s and
 *   would produce a fully black viewport for all visitors. See issue #671.
 * - For authenticated users: Redirects to the dashboard once auth resolves. A brief
 *   flash of the hero while the redirect effect fires is the accepted trade-off.
 *
 * Workspace onboarding is voluntary — users connect their Google Workspace from
 * Organization Settings rather than being prompted on first login.
 */
const SmartLanding = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect confirmed-authenticated users to the dashboard.
    // Guard on !isLoading so we don't redirect prematurely while auth is resolving.
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Authenticated and auth resolved: return null while the redirect fires.
  // The useEffect above will navigate to /dashboard on the next tick.
  if (!isLoading && user) {
    return null;
  }

  // Public marketing page — renders unconditionally for all other cases:
  //   • isLoading=true, user=null  (fresh visitor, auth still initialising)
  //   • isLoading=true, user=set   (session found but refresh in progress — brief hero flash)
  //   • isLoading=false, user=null (unauthenticated visitor)
  return (
    <>
      <PageSEO
        title="EquipQR | Heavy Equipment Repair Work Order Software with QR Tracking"
        description="Stop losing money to lost work orders. EquipQR gives heavy equipment repair shops secure QR code equipment tracking, team-based access, and one-click QuickBooks work order invoicing."
        path="/"
        keywords="heavy equipment repair work order software, QR code equipment tracking, QuickBooks work order integration, equipment maintenance software, shop work order management, fleet management, CMMS"
      />
      <Suspense
        fallback={
          <div
            className="flex min-h-[50vh] items-center justify-center bg-background"
            role="status"
            aria-label="Loading page"
          >
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Landing />
      </Suspense>
    </>
  );
};

export default SmartLanding;