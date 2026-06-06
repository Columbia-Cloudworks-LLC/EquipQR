
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, XCircle } from 'lucide-react';
import HCaptchaComponent from '@/components/ui/HCaptcha';
import { getCurrentAuthSession, signUpWithEmail } from '@/services/authSignupService';
import { validatePasswordComplexity, calculatePasswordStrength } from '@/lib/passwordPolicy';
import { checkPasswordBreachedHibp } from '@/lib/hibpPasswordCheck';
import {
  clearPendingTermsAcceptanceForUser,
  markPendingTermsAcceptanceForUser,
  recordTermsAcceptance,
} from '@/lib/termsAcceptanceRecording';
import SignUpInviteBanner from './SignUpInviteBanner';
import SignUpPrivacyNotice from './SignUpPrivacyNotice';
import SignUpPasswordField from './SignUpPasswordField';
import SignUpConfirmPasswordField from './SignUpConfirmPasswordField';
import SignUpTermsAcceptance from './SignUpTermsAcceptance';
import {
  ALL_SIGNUP_FIELDS_TOUCHED,
  buildSignupUserMetadata,
  computePasswordMatch,
  getEmailErrorForValue,
  getInvitedOrgNameConflict,
  getSignupAcceptanceError,
  getSignupFieldError,
  isSignupFormValid,
  type SignUpValidationContext,
} from './signUpFormModel';

interface SignUpFormProps {
  onSuccess: (message: string, email?: string) => void;
  onBeforeSignupSubmit?: () => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  prefillEmail?: string;
  invitedOrgId?: string;
  invitedOrgName?: string;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  onBeforeSignupSubmit,
  onError,
  isLoading,
  setIsLoading,
  prefillEmail,
  invitedOrgId,
  invitedOrgName,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: prefillEmail || '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const hcaptchaEnabled = Boolean(import.meta.env.VITE_HCAPTCHA_SITEKEY);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptanceTouched, setAcceptanceTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showRetryAcceptance, setShowRetryAcceptance] = useState(false);

  const complexity = validatePasswordComplexity(formData.password);
  const strength = calculatePasswordStrength(formData.password);

  const validationContext = useMemo<SignUpValidationContext>(
    () => ({
      formData,
      touched,
      emailError,
      orgNameError,
      passwordMatch,
      complexity,
      termsAccepted,
      acceptanceTouched,
      submitAttempted,
      hcaptchaEnabled,
      hcaptchaToken,
    }),
    [
      formData,
      touched,
      emailError,
      orgNameError,
      passwordMatch,
      complexity,
      termsAccepted,
      acceptanceTouched,
      submitAttempted,
      hcaptchaEnabled,
      hcaptchaToken,
    ],
  );

  useEffect(() => {
    if (!prefillEmail) return;
    setFormData(prev => {
      if (prefillEmail === prev.email) {
        return prev;
      }
      setEmailError(getEmailErrorForValue(prefillEmail));
      return { ...prev, email: prefillEmail };
    });
  }, [prefillEmail]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'password' || field === 'confirmPassword') {
        setPasswordMatch(
          computePasswordMatch(
            field === 'password' ? value : prev.password,
            field === 'confirmPassword' ? value : prev.confirmPassword,
            field,
            prev.password,
            prev.confirmPassword,
          ),
        );
      }

      return next;
    });

    if (field === 'email') {
      setEmailError(getEmailErrorForValue(value));
    }
    if (field === 'organizationName' && invitedOrgName) {
      setOrgNameError(getInvitedOrgNameConflict(value, invitedOrgName));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string) => getSignupFieldError(field, validationContext);

  const getAcceptanceError = () =>
    getSignupAcceptanceError(termsAccepted, acceptanceTouched, submitAttempted);

  const formIsValid = () => isSignupFormValid(validationContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitAttempted(true);
    setAcceptanceTouched(true);

    if (!termsAccepted) {
      onError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (!formIsValid()) {
      setTouched(ALL_SIGNUP_FIELDS_TOUCHED);
      onError('Please fill in all fields correctly');
      return;
    }

    setIsLoading(true);
    onBeforeSignupSubmit?.();

    try {
      const hibp = await checkPasswordBreachedHibp(formData.password);
      if (hibp.status === 'error') {
        onError(
          'Could not verify password safety (breach check unavailable). Please try again in a few minutes.',
        );
        setIsLoading(false);
        return;
      }
      if (hibp.breached) {
        onError(
          'This password appears in known data breaches. Choose a different password that you do not reuse elsewhere.',
        );
        setIsLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      const submittedEmail = formData.email.trim();
      const signUpData = buildSignupUserMetadata(formData, { invitedOrgId, invitedOrgName });

      const { data, error } = await signUpWithEmail({
        email: submittedEmail,
        password: formData.password,
        emailRedirectTo: redirectUrl,
        data: signUpData,
        ...(hcaptchaEnabled && hcaptchaToken ? { captchaToken: hcaptchaToken } : {}),
      });

      if (error) {
        onError(error.message);
        setHcaptchaToken(null);
        setIsLoading(false);
        return;
      }

      const accessToken = data.session?.access_token;
      const newUserId = data.user?.id;

      if (accessToken) {
        try {
          const recorded = await recordTermsAcceptance(accessToken);
          if (!recorded) {
            if (newUserId) markPendingTermsAcceptanceForUser(newUserId);
            setShowRetryAcceptance(true);
            onError(
              'Your account was created, but we could not save legal acceptance evidence. Use “Retry acceptance” below or sign out and sign in again after verifying email.',
            );
            setHcaptchaToken(null);
            setIsLoading(false);
            return;
          }
        } catch {
          if (newUserId) markPendingTermsAcceptanceForUser(newUserId);
          setShowRetryAcceptance(true);
          onError(
            'Your account was created, but we could not reach the server to save legal acceptance. Check your connection and use “Retry acceptance” below.',
          );
          setHcaptchaToken(null);
          setIsLoading(false);
          return;
        }
      } else if (newUserId) {
        markPendingTermsAcceptanceForUser(newUserId);
      }

      onSuccess(
        accessToken
          ? 'Account created successfully! Please check your email to verify your account and complete organization setup.'
          : 'Account created successfully! After you verify your email, your first sign-in will save your Terms acceptance record automatically. Please check your inbox to verify your account.',
        submittedEmail,
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'An error occurred during sign up');
      setHcaptchaToken(null);
    }

    setIsLoading(false);
  };

  const handleRetryAcceptance = async () => {
    setIsLoading(true);
    try {
      const { session } = await getCurrentAuthSession();
      const token = session?.access_token;
      if (!token) {
        onError('Sign in first, then retry saving acceptance.');
        setIsLoading(false);
        return;
      }
      const ok = await recordTermsAcceptance(token);
      if (ok) {
        setShowRetryAcceptance(false);
        const uid = session?.user?.id;
        if (uid) clearPendingTermsAcceptanceForUser(uid);
        onSuccess('Legal acceptance recorded successfully.');
      } else {
        onError('Could not record acceptance. Try again shortly or contact support.');
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Retry failed');
    }
    setIsLoading(false);
  };

  const handleHCaptchaVerify = (token: string) => {
    setHcaptchaToken(token);
  };

  const handleHCaptchaError = () => {
    setHcaptchaToken(null);
    onError('CAPTCHA verification failed. Please try again.');
  };

  const handleHCaptchaExpire = () => {
    setHcaptchaToken(null);
    onError('CAPTCHA expired. Please complete it again.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {invitedOrgName && <SignUpInviteBanner invitedOrgName={invitedOrgName} />}

      <SignUpPrivacyNotice />

      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          required
          aria-invalid={!!getFieldError('name')}
          aria-describedby={getFieldError('name') ? 'signup-name-error' : undefined}
        />
        {getFieldError('name') && (
          <p id="signup-name-error" className="text-sm text-destructive" aria-live="polite">
            {getFieldError('name')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCorrect="off"
          autoCapitalize="none"
          value={formData.email}
          onChange={e => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          required
          aria-invalid={!!(emailError || (touched.email && !formData.email.trim()))}
          aria-describedby={getFieldError('email') ? 'signup-email-error' : undefined}
        />
        {getFieldError('email') && (
          <p id="signup-email-error" className="text-sm text-destructive" aria-live="polite">
            {getFieldError('email')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-organization">Organization Name</Label>
        <Input
          id="signup-organization"
          type="text"
          value={formData.organizationName}
          onChange={e => handleInputChange('organizationName', e.target.value)}
          onBlur={() => handleBlur('organizationName')}
          placeholder={
            invitedOrgName ? `Enter your organization name (not ${invitedOrgName})` : 'Enter your organization name'
          }
          required
          aria-invalid={!!getFieldError('organizationName')}
          aria-describedby={getFieldError('organizationName') ? 'signup-org-error' : undefined}
        />
        {getFieldError('organizationName') && (
          <p id="signup-org-error" className="text-sm text-destructive flex items-center gap-1" aria-live="polite">
            <XCircle className="h-3 w-3" />
            {getFieldError('organizationName')}
          </p>
        )}
      </div>

      <SignUpPasswordField
        password={formData.password}
        complexity={complexity}
        strength={strength}
        error={getFieldError('password')}
        onChange={value => handleInputChange('password', value)}
        onBlur={() => handleBlur('password')}
      />

      <SignUpConfirmPasswordField
        confirmPassword={formData.confirmPassword}
        passwordMatch={passwordMatch}
        onChange={value => handleInputChange('confirmPassword', value)}
        onBlur={() => handleBlur('confirmPassword')}
      />

      <SignUpTermsAcceptance
        termsAccepted={termsAccepted}
        error={getAcceptanceError()}
        onCheckedChange={accepted => {
          setTermsAccepted(accepted);
          setAcceptanceTouched(true);
        }}
      />

      {hcaptchaEnabled && (
        <HCaptchaComponent
          onSuccess={handleHCaptchaVerify}
          onError={handleHCaptchaError}
          onExpire={handleHCaptchaExpire}
        />
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !formIsValid()}
        onClick={() => {
          setSubmitAttempted(true);
          if (!formIsValid()) {
            setTouched(ALL_SIGNUP_FIELDS_TOUCHED);
            setAcceptanceTouched(true);
          }
        }}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
        Create Account & Organization
      </Button>

      {showRetryAcceptance && (
        <Button type="button" variant="outline" className="w-full" onClick={handleRetryAcceptance} disabled={isLoading}>
          Retry saving legal acceptance
        </Button>
      )}

      {!formIsValid() && Object.keys(touched).length > 0 && (
        <p className="text-xs text-muted-foreground text-center">Fill in all required fields to continue</p>
      )}
    </form>
  );
};

export default SignUpForm;
