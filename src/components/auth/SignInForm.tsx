
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SignInFormProps {
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const SignInForm: React.FC<SignInFormProps> = ({ onError, isLoading, setIsLoading }) => {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ email?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return; // Prevent multiple submissions
    
    // Set loading immediately to prevent race conditions
    setIsLoading(true);

    try {
      // Inline validation
      const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(formData.email);
      if (!emailValid) {
        setErrors({ email: 'Enter a valid email address' });
        return;
      } else {
        setErrors(null);
      }
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        onError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          required
        />
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
