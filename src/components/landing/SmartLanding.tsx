import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Landing from '@/pages/Landing';

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