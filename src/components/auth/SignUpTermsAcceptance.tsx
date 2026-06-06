import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';

type SignUpTermsAcceptanceProps = {
  termsAccepted: boolean;
  error: string | null;
  onCheckedChange: (accepted: boolean) => void;
};

const SignUpTermsAcceptance: React.FC<SignUpTermsAcceptanceProps> = ({
  termsAccepted,
  error,
  onCheckedChange,
}) => (
  <>
    <div className="flex items-start gap-2 rounded-md border border-border p-3">
      <Checkbox
        id="terms-accept"
        checked={termsAccepted}
        onCheckedChange={v => onCheckedChange(v === true)}
        aria-invalid={!!error}
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
    {error && (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )}
  </>
);

export default SignUpTermsAcceptance;
