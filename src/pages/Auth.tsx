
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, ExternalLink, Loader2, Mail, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMFA } from '@/hooks/useMFA';
import { isMFAEnabled } from '@/lib/flags';
import { isSafeRedirectPath, getSafeRedirectPath } from '@/utils/redirectValidation';
import Logo from '@/components/ui/Logo';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';
import MFAVerification from '@/components/auth/MFAVerification';
import LegalFooter from '@/components/layout/LegalFooter';
import { useAppToast } from '@/hooks/useAppToast';

interface SignupSuccessState {
  message: string;
  email?: string;
}

const EMAIL_PROVIDER_INBOX_URLS: Record<string, string> = {
  'aol.com': 'https://mail.aol.com/',
  'fastmail.com': 'https://app.fastmail.com/mail/Inbox',
  'gmail.com': 'https://mail.google.com/mail/u/0/#inbox',
  'googlemail.com': 'https://mail.google.com/mail/u/0/#inbox',
  'hey.com': 'https://app.hey.com/',
  'hotmail.com': 'https://outlook.live.com/mail/0/inbox',
  'icloud.com': 'https://www.icloud.com/mail',
  'live.com': 'https://outlook.live.com/mail/0/inbox',
  'mac.com': 'https://www.icloud.com/mail',
  'me.com': 'https://www.icloud.com/mail',
  'msn.com': 'https://outlook.live.com/mail/0/inbox',
  'outlook.com': 'https://outlook.live.com/mail/0/inbox',
  'proton.me': 'https://mail.proton.me/u/0/inbox',
  'protonmail.com': 'https://mail.proton.me/u/0/inbox',
  'rocketmail.com': 'https://mail.yahoo.com/',
  'yahoo.com': 'https://mail.yahoo.com/',
  'ymail.com': 'https://mail.yahoo.com/',
  'zoho.com': 'https://mail.zoho.com/',
};

const getEmailProviderInboxUrl = (email?: string) => {
  const domain = email?.split('@')[1]?.trim().toLowerCase();
  return domain ? EMAIL_PROVIDER_INBOX_URLS[domain] : undefined;
};

const Auth = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth();
  const { needsVerification, refreshMFAStatus } = useMFA();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SignupSuccessState | null>(null);
  const [pendingQRScan, setPendingQRScan] = useState(false);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const { error: showErrorToast, success: showSuccessToast } = useAppToast();

  // Check if user came here from a QR scan (read-only check, doesn't clear)
  useEffect(() => {
    const pendingRedirect = sessionStorage.getItem('pendingRedirect');
    if (
      pendingRedirect &&
      isSafeRedirectPath(pendingRedirect) &&
      (pendingRedirect.includes('qr=true') || pendingRedirect.startsWith('/qr/'))
    ) {
      setPendingQRScan(true);
    }
  }, []);

  // Handle pending redirects after authentication
  // This replaces usePendingRedirectHandler to avoid race conditions with duplicate effects
  useEffect(() => {
    if (user && !authLoading) {
      // If MFA is enabled and user needs verification (e.g., after Google OAuth),
      // show the MFA verification screen instead of redirecting
      if (isMFAEnabled() && needsVerification && !showMFAVerification) {
        setShowMFAVerification(true);
        return;
      }

      // Don't redirect if we're showing MFA verification
      if (showMFAVerification) return;

      // Check for pending redirect first (e.g., from OAuth callbacks or QR scans)
      const pendingRedirect = sessionStorage.getItem('pendingRedirect');
      if (pendingRedirect) {
        // Clear it and navigate there (validated to prevent open redirects)
        sessionStorage.removeItem('pendingRedirect');
        navigate(getSafeRedirectPath(pendingRedirect), { replace: true });
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate, needsVerification, showMFAVerification]);

  const handleSuccess = (message: string, email?: string) => {
    setError(null);
    if (email) {
      setSuccess({ message, email });
      showSuccessToast({
        title: 'Check your email',
        description: message,
        duration: 10000,
      });
      return;
    }

    setSuccess(null);
    showSuccessToast({
      title: 'Success',
      description: message,
      duration: 10000,
    });
  };

  const handleReturnToSignIn = () => {
    setSuccess(null);
    navigate('/auth?tab=signin', { replace: true });
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
    showErrorToast({
      title: 'Something went wrong',
      description: errorMessage,
      duration: 6000,
    });
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();
    
    if (error) {
      handleError(error.message);
    }
    
    setIsLoading(false);
  };

  // Called by SignInForm when MFA is required after password auth
  const handleMFARequired = useCallback(() => {
    setShowMFAVerification(true);
    setError(null);
  }, []);

  // Called when MFA verification succeeds
  const handleMFASuccess = useCallback(async () => {
    // Refresh MFA status BEFORE clearing the flag so the redirect effect
    // sees needsVerification === false and won't re-show the MFA screen.
    await refreshMFAStatus();
    setShowMFAVerification(false);
    // Navigate after MFA success
    const pendingRedirect = sessionStorage.getItem('pendingRedirect');
    if (pendingRedirect) {
      sessionStorage.removeItem('pendingRedirect');
      navigate(getSafeRedirectPath(pendingRedirect), { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [refreshMFAStatus, navigate]);

  // Parse query params for tab/email/invitation info
  const { defaultTab, prefillEmail, invitedOrgId, invitedOrgName } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') || 'signin';
    const email = params.get('email') || undefined;
    const orgId = params.get('invitedOrgId') || undefined;
    const orgName = params.get('invitedOrgName') || undefined;
    return { 
      defaultTab: tab, 
      prefillEmail: email,
      invitedOrgId: orgId,
      invitedOrgName: orgName
    };
  }, [location.search]);

  const inboxUrl = getEmailProviderInboxUrl(success?.email);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-info/10 to-primary/20">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="xl" />
            </div>
            <CardTitle className="text-2xl">
              {pendingQRScan ? 'Sign in to continue' : 'Welcome to EquipQR™'}
            </CardTitle>
            <CardDescription>
              {pendingQRScan ? (
                <span className="flex items-center justify-center gap-2 text-info">
                  <QrCode className="h-4 w-4" />
                  <span>Complete sign in to view scanned equipment</span>
                </span>
              ) : (
                'Sign in to your account or create a new one to get started'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* MFA Verification Screen — shown after password or OAuth sign-in when MFA is required */}
            {success ? (
              <div className="space-y-5 text-center" data-testid="signup-success-page">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                  <CheckCircle className="h-7 w-7 text-success" aria-hidden />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Check your email</h2>
                  <p className="text-sm text-muted-foreground">
                    {success.email ? (
                      <>
                        We sent a verification link to <span className="font-medium text-foreground">{success.email}</span>.
                      </>
                    ) : (
                      'We sent you a verification link.'
                    )}{' '}
                    Open your inbox, verify your account, then return to sign in.
                  </p>
                </div>
                <Alert className="border-success/40 bg-success/10 text-left text-success-foreground">
                  <Mail className="h-4 w-4 text-success" />
                  <AlertTitle>Signup was accepted</AlertTitle>
                  <AlertDescription>{success.message}</AlertDescription>
                </Alert>
                <div className="space-y-2">
                  {inboxUrl ? (
                    <Button asChild className="w-full">
                      <a href={inboxUrl} target="_blank" rel="noopener noreferrer">
                        Open email inbox
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    </Button>
                  ) : null}
                  <Button type="button" variant={inboxUrl ? 'outline' : 'default'} className="w-full" onClick={handleReturnToSignIn}>
                    I verified my email - sign in
                  </Button>
                </div>
              </div>
            ) : showMFAVerification ? (
              <MFAVerification
                onSuccess={handleMFASuccess}
                onError={handleError}
              />
            ) : (
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
                  onMFARequired={handleMFARequired}
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
                  invitedOrgId={invitedOrgId}
                  invitedOrgName={invitedOrgName}
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
            )}
            
            {error ? (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <LegalFooter />
    </div>
  );
};

export default Auth;

