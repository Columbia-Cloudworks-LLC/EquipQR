
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import HCaptchaComponent from '@/components/ui/HCaptcha';
import { supabase } from '@/integrations/supabase/client';
import {
  PASSWORD_POLICY,
  validatePasswordComplexity,
  calculatePasswordStrength,
} from '@/lib/passwordPolicy';
import { checkPasswordBreachedHibp } from '@/lib/hibpPasswordCheck';
import {
  PRIVACY_VERSION_HASH,
  TERMS_VERSION_HASH,
} from '@/lib/legalPolicyVersions';

interface SignUpFormProps {
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  prefillEmail?: string;
  invitedOrgId?: string;
  invitedOrgName?: string;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
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

  const complexity = validatePasswordComplexity(formData.password);
  const strength = calculatePasswordStrength(formData.password);

  useEffect(() => {
    if (!prefillEmail) return;
    setFormData(prev => {
      if (prefillEmail === prev.email) {
        return prev;
      }
      const valid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(prefillEmail);
      setEmailError(valid || prefillEmail.length === 0 ? null : 'Enter a valid email address');
      return { ...prev, email: prefillEmail };
    });
  }, [prefillEmail]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'password' || field === 'confirmPassword') {
      const newPassword = field === 'password' ? value : formData.password;
      const newConfirmPassword = field === 'confirmPassword' ? value : formData.confirmPassword;

      if (newConfirmPassword) {
        setPasswordMatch(newPassword === newConfirmPassword);
      } else {
        setPasswordMatch(null);
      }
    }
    if (field === 'email') {
      const valid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);
      setEmailError(valid || value.length === 0 ? null : 'Enter a valid email address');
    }
    if (field === 'organizationName' && invitedOrgName) {
      if (value.trim().toLowerCase() === invitedOrgName.trim().toLowerCase()) {
        setOrgNameError(`Please choose a different name than "${invitedOrgName}"`);
      } else {
        setOrgNameError(null);
      }
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string): string | null => {
    if (!touched[field]) return null;
    switch (field) {
      case 'name':
        return !formData.name.trim() ? 'Full name is required' : null;
      case 'email':
        if (!formData.email.trim()) return 'Email is required';
        return emailError;
      case 'organizationName':
        if (orgNameError) return orgNameError;
        return !formData.organizationName.trim() ? 'Organization name is required' : null;
      case 'password':
        if (!formData.password) return 'Password is required';
        return complexity.valid ? null : complexity.errors[0] ?? 'Password does not meet requirements';
      case 'confirmPassword':
        if (!formData.confirmPassword) return 'Please confirm your password';
        return passwordMatch === false ? 'Passwords do not match' : null;
      default:
        return null;
    }
  };

  const getAcceptanceError = (): string | null => {
    if (!acceptanceTouched && !submitAttempted) return null;
    return termsAccepted ? null : 'You must accept the Terms of Service and Privacy Policy';
  };

  const isFormValid = () => {
    const baseValid =
      formData.name.trim() &&
      formData.email.trim() &&
      complexity.valid &&
      formData.confirmPassword &&
      formData.organizationName.trim() &&
      passwordMatch === true &&
      !orgNameError &&
      termsAccepted;

    return hcaptchaEnabled ? baseValid && !!hcaptchaToken : baseValid;
  };

  const recordTermsAcceptance = async (accessToken: string): Promise<boolean> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/record-terms-acceptance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        terms_version_hash: TERMS_VERSION_HASH,
        privacy_version_hash: PRIVACY_VERSION_HASH,
        accepted_at: new Date().toISOString(),
      }),
    });

    const payload = await res.json().catch(() => ({}));
    return res.ok && payload?.success === true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitAttempted(true);
    setAcceptanceTouched(true);

    if (!termsAccepted) {
      onError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (!isFormValid()) {
      setTouched({
        name: true,
        email: true,
        organizationName: true,
        password: true,
        confirmPassword: true,
      });
      onError('Please fill in all fields correctly');
      return;
    }

    setIsLoading(true);

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

      const signUpData: Record<string, string> = {
        name: formData.name,
        organization_name: formData.organizationName,
      };

      if (invitedOrgId) {
        signUpData.invited_organization_id = invitedOrgId;
      }
      if (invitedOrgName) {
        signUpData.invited_organization_name = invitedOrgName;
      }
      if (invitedOrgId || invitedOrgName) {
        signUpData.signup_source = 'invite';
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: signUpData,
          ...(hcaptchaEnabled && hcaptchaToken ? { captchaToken: hcaptchaToken } : {}),
        },
      });

      if (error) {
        onError(error.message);
        setHcaptchaToken(null);
        setIsLoading(false);
        return;
      }

      const accessToken = data.session?.access_token;
      if (accessToken) {
        const recorded = await recordTermsAcceptance(accessToken);
        if (!recorded) {
          onError(
            'Your account was created, but we could not save legal acceptance evidence. Use “Retry acceptance” below or sign out and sign in again after verifying email.',
          );
          setHcaptchaToken(null);
          setIsLoading(false);
          return;
        }
      }

      onSuccess(
        accessToken
          ? 'Account created successfully! Please check your email to verify your account and complete organization setup.'
          : 'Account created successfully! After you verify your email, sign in once so we can finalize your Terms acceptance record. Please check your inbox to verify your account.',
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
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        onError('Sign in first, then retry saving acceptance.');
        setIsLoading(false);
        return;
      }
      const ok = await recordTermsAcceptance(token);
      if (ok) {
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

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {invitedOrgName && (
        <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm">
          <p className="text-info">
            You'll join <strong>{invitedOrgName}</strong> after signing up. Please choose a different name for your own workspace below.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed">
        We collect your name, email, and organization details to create your account. See our{' '}
        <Link to="/privacy-policy#notice-at-collection" className="text-primary underline underline-offset-2">
          Privacy Notice at Collection
        </Link>
        .
      </p>

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

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={e => handleInputChange('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          required
          minLength={PASSWORD_POLICY.minLength}
          aria-invalid={!!getFieldError('password')}
          aria-describedby="signup-password-hint"
        />
        <div id="signup-password-hint" className="space-y-2 text-sm">
          <p className="text-muted-foreground">Password must have:</p>
          <ul className="space-y-1">
            <li className={complexity.hasMinLength ? 'text-success' : 'text-muted-foreground'}>
              {complexity.hasMinLength ? <CheckCircle className="inline h-3 w-3 mr-1" /> : <XCircle className="inline h-3 w-3 mr-1" />}
              At least {PASSWORD_POLICY.minLength} characters
            </li>
            <li className={complexity.hasNumber ? 'text-success' : 'text-muted-foreground'}>
              {complexity.hasNumber ? <CheckCircle className="inline h-3 w-3 mr-1" /> : <XCircle className="inline h-3 w-3 mr-1" />}
              One number
            </li>
            <li className={complexity.hasSymbol ? 'text-success' : 'text-muted-foreground'}>
              {complexity.hasSymbol ? <CheckCircle className="inline h-3 w-3 mr-1" /> : <XCircle className="inline h-3 w-3 mr-1" />}
              One symbol (e.g. ! @ # $)
            </li>
          </ul>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Strength</span>
              <span>{strengthLabel}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(seg => (
                <div
                  key={seg}
                  className={`h-1.5 flex-1 rounded-full ${strength >= seg ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
        </div>
        {getFieldError('password') && (
          <p className="text-sm text-destructive" aria-live="polite">
            {getFieldError('password')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={e => handleInputChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            required
            className={
              passwordMatch === false
                ? 'border-destructive'
                : passwordMatch === true
                  ? 'border-success/30'
                  : ''
            }
          />
          {passwordMatch !== null && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {passwordMatch ? (
                <CheckCircle className="h-4 w-4 text-success" data-testid="password-match-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" data-testid="password-match-error" />
              )}
            </div>
          )}
        </div>
        {passwordMatch === false && <p className="text-sm text-destructive">Passwords do not match</p>}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border p-3">
        <Checkbox
          id="terms-accept"
          checked={termsAccepted}
          onCheckedChange={v => {
            setTermsAccepted(v === true);
            setAcceptanceTouched(true);
          }}
          aria-invalid={!!getAcceptanceError()}
        />
        <label htmlFor="terms-accept" className="text-sm leading-snug cursor-pointer">
          I have read and agree to the{' '}
          <Link to="/terms-of-service" className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
            Privacy Policy
          </Link>
          .
        </label>
      </div>
      {getAcceptanceError() && (
        <p className="text-sm text-destructive" role="alert">
          {getAcceptanceError()}
        </p>
      )}

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
        disabled={isLoading || !isFormValid()}
        onClick={() => {
          setSubmitAttempted(true);
          if (!isFormValid()) {
            setTouched({
              name: true,
              email: true,
              organizationName: true,
              password: true,
              confirmPassword: true,
            });
            setAcceptanceTouched(true);
          }
        }}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
        Create Account & Organization
      </Button>

      <Button type="button" variant="outline" className="w-full" onClick={handleRetryAcceptance} disabled={isLoading}>
        Retry saving legal acceptance
      </Button>

      {!isFormValid() && Object.keys(touched).length > 0 && (
        <p className="text-xs text-muted-foreground text-center">Fill in all required fields to continue</p>
      )}
    </form>
  );
};

export default SignUpForm;
