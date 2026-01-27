import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageSEO } from '@/components/seo/PageSEO';
import Landing from '@/pages/Landing';

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
          title="EquipQR"
          description="Streamline equipment operations with QR code tracking, intelligent work order management, and enterprise-grade team collaboration. Trusted by industry leaders. Start your free trial today."
          path="/"
          keywords="fleet management, equipment tracking, QR code, work orders, CMMS, maintenance management, team collaboration, mobile-first, enterprise"
        />
        <Landing />
      </>
    );
  }

  // Return null while redirecting authenticated users
  return null;
};

export default SmartLanding;