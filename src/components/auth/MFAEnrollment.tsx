import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useMFA } from '@/hooks/useMFA';
import { useAppToast } from '@/hooks/useAppToast';
import { Loader2, Copy, Check, ShieldPlus } from 'lucide-react';

interface MFAEnrollmentProps {
  onComplete: () => void;
  onSkip?: () => void;
  /** When true, the skip button is hidden and enrollment is mandatory */
  isRequired?: boolean;
}

interface EnrollmentData {
  qrCode: string;
  secret: string;
  factorId: string;
}

const MFAEnrollment: React.FC<MFAEnrollmentProps> = ({
  onComplete,
  onSkip,
  isRequired = false,
}) => {
  const { enrollTOTP, verifyTOTP } = useMFA();
  const toast = useAppToast();
  const [step, setStep] = useState<'loading' | 'scan' | 'verify'>('loading');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the "copied" timeout on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Initialize enrollment on mount (rule 5.7 — effect for one-time setup, not interaction)
  useEffect(() => {
    let cancelled = false;

    const initEnrollment = async () => {
      const data = await enrollTOTP();
      if (cancelled) return;

      if (data) {
        setEnrollmentData(data);
        setStep('scan');
      } else {
        setError('Failed to start MFA enrollment. Please try again.');
      }
    };

    initEnrollment();
    return () => { cancelled = true; };
    // enrollTOTP is stable via useCallback
  }, [enrollTOTP]);

  const copySecret = useCallback(async () => {
    if (!enrollmentData?.secret) return;

    try {
      await navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
      toast.error({ description: 'Failed to copy to clipboard' });
    }
  }, [enrollmentData?.secret, toast]);

  const handleVerify = useCallback(async (verifyCode: string) => {
    if (!enrollmentData || verifyCode.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    const { error: verifyError } = await verifyTOTP(enrollmentData.factorId, verifyCode);

    setIsVerifying(false);

    if (verifyError) {
      toast.error({
        title: 'Verification Failed',
        description: 'Invalid code. Please try again.',
      });
      setError('Invalid code. Please try again.');
      setCode('');
    } else {
      toast.success({
        title: 'MFA Enabled',
        description: 'Two-factor authentication has been set up successfully.',
      });
      onComplete();
    }
  }, [enrollmentData, verifyTOTP, toast, onComplete]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    if (value.length === 6) {
      handleVerify(value);
    }
  }, [handleVerify]);

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div role="status" aria-label="Setting up two-factor authentication">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Setting up authenticator...</p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldPlus className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Set Up Two-Factor Authentication
        </h2>
        <p className="text-sm text-muted-foreground">
          {isRequired
            ? 'Your role requires two-factor authentication for security.'
            : 'Add an extra layer of security to your account.'}
        </p>
      </div>

      {/* Step 1: Scan QR Code */}
      {step === 'scan' && enrollmentData ? (
        <>
          <div className="rounded-lg border bg-card p-4">
            <img
              src={enrollmentData.qrCode}
              alt="QR code for authenticator app setup — scan with Google Authenticator, Authy, or similar"
              className="h-48 w-48 mx-auto"
            />
          </div>

          <div className="flex flex-col items-center space-y-2 text-center">
            <p className="text-xs text-muted-foreground">
              Can&apos;t scan? Enter this code manually:
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <code className="text-xs font-mono break-all select-all">
                {enrollmentData.secret}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={copySecret}
                aria-label="Copy secret to clipboard"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          <Button onClick={() => setStep('verify')} className="w-full max-w-[260px]">
            I&apos;ve Scanned the Code
          </Button>
        </>
      ) : null}

      {/* Step 2: Verify Code */}
      {step === 'verify' ? (
        <>
          <p className="text-sm text-muted-foreground text-center">
            Enter the 6-digit code from your authenticator app to confirm setup
          </p>

          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              disabled={isVerifying}
              aria-label="Verification code"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'mfa-enroll-error' : undefined}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {error ? (
              <p
                id="mfa-enroll-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2 w-full max-w-[260px]">
            <Button
              variant="outline"
              onClick={() => {
                setStep('scan');
                setCode('');
                setError(null);
              }}
              className="flex-1"
              disabled={isVerifying}
            >
              Back
            </Button>
            <Button
              onClick={() => handleVerify(code)}
              disabled={isVerifying || code.length !== 6}
              className="flex-1"
            >
              {isVerifying ? (
                <div role="status" aria-label="Verifying code">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </div>
              ) : null}
              Verify &amp; Enable
            </Button>
          </div>
        </>
      ) : null}

      {/* Skip option (only when not required) */}
      {!isRequired && onSkip ? (
        <Button
          variant="link"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip for now
        </Button>
      ) : null}
    </div>
  );
};

export default MFAEnrollment;
