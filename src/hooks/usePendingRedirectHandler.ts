import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getSafeRedirectPath } from '@/utils/redirectValidation';

/**
 * Hook to handle pending redirects after authentication
 */
export const usePendingRedirectHandler = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    // Check for pending redirect from QR scan
    const pendingRedirect = sessionStorage.getItem('pendingRedirect');
    
    if (pendingRedirect) {
      // Found pending redirect
      
      // Clear the pending redirect
      sessionStorage.removeItem('pendingRedirect');
      
      // Small delay to ensure authentication is fully processed
      setTimeout(() => {
        // Validate the redirect path to prevent open-redirect attacks
        navigate(getSafeRedirectPath(pendingRedirect), { replace: true });
      }, 100);
    }
  }, [user, isLoading, navigate]);
};