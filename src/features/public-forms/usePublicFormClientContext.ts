/**
 * Shared client-context hooks for public token-gated forms: optional GPS
 * capture with consent status and hCaptcha wiring.
 */

import { useEffect, useState } from 'react';

export type PublicFormGpsStatus = 'idle' | 'pending' | 'granted' | 'denied';

export interface PublicFormGeolocation {
  coords: { lat: number; lng: number } | null;
  gpsStatus: PublicFormGpsStatus;
}

/** Request browser geolocation once when `enabled` becomes true. */
export function usePublicFormGeolocation(enabled: boolean): PublicFormGeolocation {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<PublicFormGpsStatus>('idle');

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('granted');
      },
      () => {
        setCoords(null);
        setGpsStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [enabled]);

  return { coords, gpsStatus };
}

export interface PublicFormCaptchaState {
  hcaptchaToken: string | null;
  setHcaptchaToken: (token: string | null) => void;
  /** Render the CAPTCHA widget (required + site key configured). */
  showCaptcha: boolean;
  /** Required by the server but no site key in this build — block submits. */
  captchaMisconfigured: boolean;
}

/** hCaptcha visibility/misconfiguration state shared by public form pages. */
export function usePublicFormCaptcha(captchaRequired: boolean): PublicFormCaptchaState {
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined;

  return {
    hcaptchaToken,
    setHcaptchaToken,
    showCaptcha: captchaRequired && Boolean(hcaptchaSiteKey),
    captchaMisconfigured: captchaRequired && !hcaptchaSiteKey,
  };
}

export interface PublicFormSubmissionState extends PublicFormCaptchaState, PublicFormGeolocation {
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  submitted: boolean;
  setSubmitted: (value: boolean) => void;
  submittedAt: string | null;
  setSubmittedAt: (value: string | null) => void;
}

/**
 * Bundled submit-lifecycle state for public token-gated form pages:
 * submitting/submitted flags plus the CAPTCHA and optional GPS context.
 */
export function usePublicFormSubmission(options: {
  captchaRequired: boolean;
  collectGps: boolean;
}): PublicFormSubmissionState {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const captcha = usePublicFormCaptcha(options.captchaRequired);
  const geolocation = usePublicFormGeolocation(options.collectGps);

  return {
    submitting,
    setSubmitting,
    submitted,
    setSubmitted,
    submittedAt,
    setSubmittedAt,
    ...captcha,
    ...geolocation,
  };
}

/** Format a submission timestamp in the submitter's locale. */
export function formatPublicSubmittedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
