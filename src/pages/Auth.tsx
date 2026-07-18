
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, ExternalLink, Loader2, Mail, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMFA } from '@/hooks/useMFA';
import { isMFAEnabled } from '@/lib/flags';
import {
  getSafeNextParam,
  getSafeRedirectPath,
  isSafeRedirectPath,
} from '@/utils/redirectValidation';
import Logo from '@/components/ui/Logo';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';
import MFAVerification from '@/components/auth/MFAVerification';
import LegalFooter from '@/components/layout/LegalFooter';
import { useAppToast } from '@/hooks/useAppToast';
import { AuthGoogleSignInButton } from '@/pages/AuthGoogleSignInButton';

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

/** Prefer OAuth `?next=`, then sessionStorage pendingRedirect; else fallback. */
function navigateAfterAuth(
  search: string,
  navigate: NavigateFunction,
  fallback = '/',
): void {
  const pendingRedirect =
    getSafeNextParam(search) ?? sessionStorage.getItem('pendingRedirect');
  if (pendingRedirect) {
    sessionStorage.removeItem('pendingRedirect');
    navigate(getSafeRedirectPath(pendingRedirect), { replace: true });
    return;
  }
  navigate(fallback, { replace: true });
}

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
  const suppressAuthRedirectRef = useRef(false);
  const { error: showErrorToast, success: showSuccessToast } = useAppToast();

  // Detect QR-scan messaging from OAuth `?next=` or existing sessionStorage.
  // Do not copy `next` into sessionStorage — keep the destination in the URL
  // (and any pre-OAuth pendingRedirect already stored by QR/ProtectedRoute).
  useEffect(() => {
    const pendingRedirect =
      getSafeNextParam(location.search) ??
      sessionStorage.getItem('pendingRedirect');
    if (
      pendingRedirect &&
      isSafeRedirectPath(pendingRedirect) &&
      (pendingRedirect.includes('qr=true') || pendingRedirect.startsWith('/qr/'))
    ) {
      setPendingQRScan(true);
    }
  }, [location.search]);

  // Handle pending redirects after authentication
  // This replaces usePendingRedirectHandler to avoid race conditions with duplicate effects
  useEffect(() => {
    if (user && !authLoading) {
      // Keep the post-signup success view visible until the user continues to sign-in.
      if (suppressAuthRedirectRef.current || success) return;

      // If MFA is enabled and user needs verification (e.g., after Google OAuth),
      // show the MFA verification screen instead of redirecting
      if (isMFAEnabled() && needsVerification && !showMFAVerification) {
        setShowMFAVerification(true);
        return;
      }

      // Don't redirect if we're showing MFA verification
      if (showMFAVerification) return;

      navigateAfterAuth(location.search, navigate);
    }
  }, [
    user,
    authLoading,
    navigate,
    needsVerification,
    showMFAVerification,
    success,
    location.search,
  ]);

  const handleSuccess = (message: string, email?: string) => {
    setError(null);
    if (email) {
      suppressAuthRedirectRef.current = true;
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
    suppressAuthRedirectRef.current = false;
    setSuccess(null);
    navigate('/auth?tab=signin', { replace: true });
  };

  const handleError = (errorMessage: string) => {
    suppressAuthRedirectRef.current = false;
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
    navigateAfterAuth(location.search, navigate);
  }, [refreshMFAStatus, navigate, location.search]);

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
                  <AuthGoogleSignInButton onClick={handleGoogleSignIn} disabled={isLoading} />
                </div>
              </TabsContent>
              
              <TabsContent value="signup">
                <SignUpForm
                  onBeforeSignupSubmit={() => {
                    suppressAuthRedirectRef.current = true;
                  }}
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
                  <AuthGoogleSignInButton
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    label="Sign up with Google"
                  />
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

