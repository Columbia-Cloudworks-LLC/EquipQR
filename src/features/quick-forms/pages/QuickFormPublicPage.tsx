import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HCaptchaComponent from '@/components/ui/HCaptcha';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicFormFieldInput } from '@/features/public-forms/PublicFormFieldInput';
import {
  PublicFormErrorState,
  PublicFormLoadingState,
  PublicFormSuccessCard,
} from '@/features/public-forms/PublicFormStates';
import {
  formatPublicSubmittedAt,
  usePublicFormSubmission,
} from '@/features/public-forms/usePublicFormClientContext';
import {
  loadQuickForm,
  submitQuickForm,
} from '@/features/quick-forms/services/quickFormPublicService';
import {
  validateQuickFormValues,
  type QuickFormField,
} from '@/features/quick-forms/types/quickForm';

export default function QuickFormPublicPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [fields, setFields] = useState<QuickFormField[]>([]);
  const [collectLocation, setCollectLocation] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const {
    submitting,
    setSubmitting,
    submitted,
    setSubmitted,
    submittedAt,
    setSubmittedAt,
    hcaptchaToken,
    setHcaptchaToken,
    showCaptcha,
    captchaMisconfigured,
    coords,
    gpsStatus,
  } = usePublicFormSubmission({
    captchaRequired,
    collectGps: collectLocation && Boolean(token),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await loadQuickForm(token);
        if (cancelled) return;
        setFormName(data.form.name);
        setFormDescription(data.form.description);
        setOrganizationName(data.form.organizationName);
        setFields(data.form.fields);
        setCollectLocation(data.form.collectLocation);
        setCaptchaRequired(data.captchaRequired);
      } catch {
        if (!cancelled) setLoadError('This form link is not available.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const validation = useMemo(() => validateQuickFormValues(fields, values), [fields, values]);

  const canSubmit =
    !captchaMisconfigured &&
    validation.isComplete &&
    (!captchaRequired || hcaptchaToken !== null);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitQuickForm({
        token,
        fieldValues: values,
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        captchaToken: hcaptchaToken ?? undefined,
      });
      setSubmittedAt(result.submittedAt);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit the form.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  if (loading) {
    return <PublicFormLoadingState message="Loading form…" />;
  }

  if (loadError) {
    return <PublicFormErrorState message={loadError} />;
  }

  if (submitted) {
    return (
      <PublicFormSuccessCard title="Submission received">
        <p>
          Your <strong className="text-foreground">{formName}</strong> submission was saved
          {submittedAt ? ` at ${formatPublicSubmittedAt(submittedAt)}` : ''}.
        </p>
        <p className="text-xs">You can close this page, or submit again with the same QR code.</p>
      </PublicFormSuccessCard>
    );
  }

  return (
    <>
      <PageSEO title={`${formName} — Quick Form`} noindex />
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{formName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{organizationName}</p>
          {formDescription && <p className="text-sm mt-2">{formDescription}</p>}
        </div>

        {captchaMisconfigured && (
          <Alert variant="destructive">
            <AlertDescription>
              This form cannot accept submissions right now because CAPTCHA is not configured for this environment.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => (
              <PublicFormFieldInput
                key={field.id}
                fieldId={`quick-form-field-${field.id}`}
                label={field.label}
                inputType={field.inputType}
                required={field.required !== false}
                helpText={field.helpText}
                value={values[field.id]}
                onChange={(value) => updateValue(field.id, value)}
              />
            ))}

            {collectLocation && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Your location</p>
                <p className="text-sm text-muted-foreground">
                  {gpsStatus === 'pending'
                    ? 'Requesting location…'
                    : gpsStatus === 'granted' && coords
                      ? `${coords.lat}, ${coords.lng}`
                      : 'Not provided'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {showCaptcha && (
          <HCaptchaComponent onVerify={setHcaptchaToken} onExpire={() => setHcaptchaToken(null)} />
        )}

        {validation.errors.length > 0 && (
          <Alert>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {captchaRequired && !hcaptchaToken && !captchaMisconfigured && (
          <p className="text-xs text-muted-foreground text-center">Complete the CAPTCHA below to submit.</p>
        )}

        <Button className="w-full" size="lg" disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
    </>
  );
}
