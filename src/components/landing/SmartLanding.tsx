import React, { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageSEO } from '@/components/seo/PageSEO';
import { Loader2 } from 'lucide-react';

const Landing = lazy(() => import('@/pages/Landing'));

/**
 * Smart landing page that conditionally renders based on authentication state.
 * 
 * - For unauthenticated users: Displays the public landing page
 * - For authenticated users: Redirects to the dashboard
 * 
 * Workspace onboarding is now voluntary - users can connect their Google Workspace
 * from Organization Settings rather than being prompted on first login.
 */
const SmartLanding = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is authenticated and not loading, redirect to dashboard
    // Workspace onboarding is now voluntary - users can connect from Organization Settings
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Show loading state or nothing while checking auth
  if (isLoading) {
    return null;
  }

  // Show landing page only for unauthenticated users
  if (!user) {
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
  }

  // Return null while redirecting authenticated users
  return null;
};

export default SmartLanding;