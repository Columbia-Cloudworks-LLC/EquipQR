
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePendingRedirectHandler } from '@/hooks/usePendingRedirectHandler';
import Logo from '@/components/ui/Logo';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';
import LegalFooter from '@/components/layout/LegalFooter';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingQRScan, setPendingQRScan] = useState(false);

  // Handle pending redirects after authentication
  usePendingRedirectHandler();

  // Check if user came here from a QR scan
  useEffect(() => {
    const pendingRedirect = sessionStorage.getItem('pendingRedirect');
    if (pendingRedirect && pendingRedirect.includes('qr=true')) {
      setPendingQRScan(true);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      // The usePendingRedirectHandler will handle the redirect
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();
    
    if (error) {
      setError(error.message);
    }
    
    setIsLoading(false);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  // Parse query params for tab/email
  const { defaultTab, prefillEmail } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') || 'signin';
    const email = params.get('email') || undefined;
    return { defaultTab: tab, prefillEmail: email };
  }, [location.search]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="xl" />
            </div>
            <CardTitle className="text-2xl">
              {pendingQRScan ? 'Sign in to continue' : 'Welcome to EquipQR'}
            </CardTitle>
            <CardDescription>
              {pendingQRScan ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <QrCode className="h-4 w-4" />
                  <span>Complete sign in to view scanned equipment</span>
                </div>
              ) : (
                'Sign in to your account or create a new one to get started'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <SignInForm 
                  onError={handleError}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
                
                <div className="mt-4">
                  <Separator className="my-4" />
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="signup">
                <SignUpForm 
                  onSuccess={handleSuccess}
                  onError={handleError}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  prefillEmail={prefillEmail}
                />
                
                <div className="mt-4">
                  <Separator className="my-4" />
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign up with Google
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mt-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      <LegalFooter />
    </div>
  );
};

export default Auth;
