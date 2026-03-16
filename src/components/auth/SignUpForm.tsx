
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import HCaptchaComponent from '@/components/ui/HCaptcha';
import { supabase } from '@/integrations/supabase/client';

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
  invitedOrgName
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: prefillEmail || '',
    password: '',
    confirmPassword: '',
    organizationName: ''
  });
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const hcaptchaEnabled = Boolean(import.meta.env.VITE_HCAPTCHA_SITEKEY);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync email field with prefillEmail when it changes (e.g., switching invitations)
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
    
    // Check password match in real-time
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
      // Validate that org name doesn't match the invited organization
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
        return formData.password.length < 6 ? 'Password must be at least 6 characters' : null;
      case 'confirmPassword':
        if (!formData.confirmPassword) return 'Please confirm your password';
        return passwordMatch === false ? 'Passwords do not match' : null;
      default:
        return null;
    }
  };

  const isFormValid = () => {
    const baseValid = formData.name.trim() && 
      formData.email.trim() && 
      formData.password.length >= 6 && 
      formData.confirmPassword && 
      formData.organizationName.trim() && 
      passwordMatch === true &&
      !orgNameError;

    return hcaptchaEnabled ? (baseValid && !!hcaptchaToken) : baseValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      onError('Please fill in all fields correctly');
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const signUpData: Record<string, string> = {
        name: formData.name,
        organization_name: formData.organizationName
      };

      // Include invitation metadata if present
      if (invitedOrgId) {
        signUpData.invited_organization_id = invitedOrgId;
      }
      if (invitedOrgName) {
        signUpData.invited_organization_name = invitedOrgName;
      }
      if (invitedOrgId || invitedOrgName) {
        signUpData.signup_source = 'invite';
      }
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: signUpData,
          ...(hcaptchaEnabled && hcaptchaToken ? { captchaToken: hcaptchaToken } : {})
        }
      });
      
      if (error) {
        onError(error.message);
        setHcaptchaToken(null);
      } else {
        onSuccess('Account created successfully! Please check your email to verify your account and complete organization setup.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'An error occurred during sign up');
      setHcaptchaToken(null);
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
      {invitedOrgName && (
        <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm">
          <p className="text-info">
            You'll join <strong>{invitedOrgName}</strong> after signing up. Please choose a different name for your own workspace below.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          required
          aria-invalid={!!getFieldError('name')}
          aria-describedby={getFieldError('name') ? 'signup-name-error' : undefined}
        />
        {getFieldError('name') && (
          <p id="signup-name-error" className="text-sm text-destructive" aria-live="polite">{getFieldError('name')}</p>
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
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          required
          aria-invalid={!!(emailError || (touched.email && !formData.email.trim()))}
          aria-describedby={getFieldError('email') ? 'signup-email-error' : undefined}
        />
        {getFieldError('email') && (
          <p id="signup-email-error" className="text-sm text-destructive" aria-live="polite">{getFieldError('email')}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-organization">Organization Name</Label>
        <Input
          id="signup-organization"
          type="text"
          value={formData.organizationName}
          onChange={(e) => handleInputChange('organizationName', e.target.value)}
          onBlur={() => handleBlur('organizationName')}
          placeholder={invitedOrgName ? `Enter your organization name (not ${invitedOrgName})` : "Enter your organization name"}
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
          onChange={(e) => handleInputChange('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          required
          minLength={6}
          aria-invalid={!!getFieldError('password')}
          aria-describedby={getFieldError('password') ? 'signup-password-error' : undefined}
        />
        {getFieldError('password') && (
          <p id="signup-password-error" className="text-sm text-destructive" aria-live="polite">{getFieldError('password')}</p>
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
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            required
            className={passwordMatch === false ? 'border-destructive' : passwordMatch === true ? 'border-success/30' : ''}
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
        {passwordMatch === false && (
          <p className="text-sm text-destructive">Passwords do not match</p>
        )}
      </div>
      
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
          if (!isFormValid()) {
            setTouched({ name: true, email: true, organizationName: true, password: true, confirmPassword: true });
          }
        }}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
        Create Account & Organization
      </Button>
      {!isFormValid() && Object.keys(touched).length > 0 && (
        <p className="text-xs text-muted-foreground text-center">Fill in all required fields to continue</p>
      )}
    </form>
  );
};

export default SignUpForm;

