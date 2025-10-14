
import React, { useState } from 'react';
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
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onError, isLoading, setIsLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: ''
  });
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

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
  };

  const isFormValid = () => {
    return formData.name.trim() && 
           formData.email.trim() && 
           formData.password.length >= 6 && 
           formData.confirmPassword && 
           formData.organizationName.trim() && 
           passwordMatch === true && 
           hcaptchaToken;
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
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: formData.name,
            organization_name: formData.organizationName
          },
          captchaToken: hcaptchaToken
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
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
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
          required
          aria-invalid={emailError ? 'true' : 'false'}
          aria-describedby={emailError ? 'signup-email-error' : undefined}
        />
        {emailError && (
          <p id="signup-email-error" className="text-sm text-destructive" aria-live="polite">{emailError}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-organization">Organization Name</Label>
        <Input
          id="signup-organization"
          type="text"
          value={formData.organizationName}
          onChange={(e) => handleInputChange('organizationName', e.target.value)}
          placeholder="Enter your organization name"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          required
          minLength={6}
        />
        {formData.password && formData.password.length < 6 && (
          <p className="text-sm text-destructive">Password must be at least 6 characters</p>
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
            required
            className={passwordMatch === false ? 'border-destructive' : passwordMatch === true ? 'border-green-500' : ''}
          />
          {passwordMatch !== null && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {passwordMatch ? (
                <CheckCircle className="h-4 w-4 text-green-500" data-testid="password-match-success" />
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
      
      <HCaptchaComponent
        onSuccess={handleHCaptchaVerify}
        onError={handleHCaptchaError}
        onExpire={handleHCaptchaExpire}
      />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !isFormValid()}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
        Create Account & Organization
      </Button>
    </form>
  );
};

export default SignUpForm;
