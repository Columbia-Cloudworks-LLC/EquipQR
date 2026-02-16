
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Debugging logs for auth state (dev only to prevent PII logging)
  if (import.meta.env.DEV) {
    logger.debug('ProtectedRoute auth state', {
      user: user ? `${user.email} (${user.id})` : 'null',
      isLoading,
      timestamp: new Date().toISOString()
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div role="status" aria-label="Checking authentication" className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (import.meta.env.DEV) {
      logger.info('ProtectedRoute redirecting to auth (no user)');
    }
    
    // Save the current URL (with query params) so we can redirect back after login
    // This is important for OAuth callbacks (QuickBooks, etc.) that include result params
    const currentUrl = location.pathname + location.search;
    if (currentUrl !== '/' && currentUrl !== '/auth') {
      sessionStorage.setItem('pendingRedirect', currentUrl);
    }
    
    return <Navigate to="/auth" replace />;
  }

  if (import.meta.env.DEV) {
    logger.info('ProtectedRoute access granted');
  }
  return <>{children}</>;
};

export default ProtectedRoute;
