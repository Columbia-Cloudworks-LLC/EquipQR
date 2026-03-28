
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isMFAEnabled } from '@/lib/flags';
import DevQuickLogin from './DevQuickLogin';

interface SignInFormProps {
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  /** Called when MFA verification is required after successful password auth */
  onMFARequired?: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({ onError, isLoading, setIsLoading, onMFARequired }) => {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    auth?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return; // Prevent multiple submissions
    
    // Set loading immediately to prevent race conditions
    setIsLoading(true);

    try {
      const emailTrimmed = formData.email.trim();
      const passwordTrimmed = formData.password.trim();
      const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(emailTrimmed);
      const nextErrors: { email?: string; password?: string; auth?: string } = {};

      if (!emailTrimmed) {
        nextErrors.email = 'Email is required';
      } else if (!emailValid) {
        nextErrors.email = 'Enter a valid email address';
      }

      if (!passwordTrimmed) {
        nextErrors.password = 'Password is required';
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }

      setErrors(null);

      const { error } = await signIn(emailTrimmed, formData.password);
      
      if (error) {
        const msg =
          error.message?.trim() ||
          'Sign in failed. Check your email and password.';
        setErrors({ auth: msg });
        onError(msg);
        return;
      }

      // Check if MFA verification is needed after successful sign-in
      if (isMFAEnabled() && onMFARequired) {
        try {
          const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (data && data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
            onMFARequired();
            return;
          }
        } catch {
          // If MFA check fails, proceed normally — user can still be prompted later
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dev-only quick login - tree-shaken out of production builds */}
      <DevQuickLogin onAuthFailure={onError} />
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCorrect="off"
          autoCapitalize="none"
          value={formData.email}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, email: e.target.value }));
            setErrors((prev) => {
              if (!prev?.email && !prev?.auth) return prev;
              return { ...prev, email: undefined, auth: undefined };
            });
          }}
          required
          aria-invalid={errors?.email ? 'true' : 'false'}
          aria-describedby={errors?.email ? 'signin-email-error' : undefined}
        />
        {errors?.email && (
          <p id="signin-email-error" className="text-sm text-destructive" aria-live="polite">{errors.email}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, password: e.target.value }));
            setErrors((prev) => {
              if (!prev?.password && !prev?.auth) return prev;
              return { ...prev, password: undefined, auth: undefined };
            });
          }}
          required
          aria-invalid={errors?.password || errors?.auth ? 'true' : 'false'}
          aria-describedby={
            errors?.password
              ? 'signin-password-error'
              : errors?.auth
                ? 'signin-auth-error'
                : undefined
          }
        />
        {errors?.password && (
          <p
            id="signin-password-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.password}
          </p>
        )}
        {errors?.auth && (
          <p
            id="signin-auth-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.auth}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && (
          <div role="status" aria-label="Loading">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          </div>
        )}
        Sign In
      </Button>
    </form>
  );
};

export default SignInForm;
