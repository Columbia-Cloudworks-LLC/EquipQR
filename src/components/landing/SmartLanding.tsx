import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
    return <Landing />;
  }

  // Return null while redirecting authenticated users
  return null;
};

export default SmartLanding;