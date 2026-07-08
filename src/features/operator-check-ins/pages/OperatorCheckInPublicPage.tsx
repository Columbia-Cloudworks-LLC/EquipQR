import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
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
  loadOperatorCheckinForm,
  submitOperatorCheckin,
} from '@/features/operator-check-ins/services/operatorCheckinPublicService';
import type {
  CapturedFieldValue,
  OperatorChecklistAnswer,
  OperatorChecklistDataField,
  OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';
import {
  formatCapturedFieldValue,
  validateOperatorChecklistAnswers,
  validateOperatorInputFields,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { groupChecklistItemsBySection } from '@/utils/pmChecklistHelpers';
import { OperatorCheckinChecklistItemRow } from '@/features/operator-check-ins/components/OperatorCheckinChecklistItemRow';

export default function OperatorCheckInPublicPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [dataFields, setDataFields] = useState<OperatorChecklistDataField[]>([]);
  const [items, setItems] = useState<OperatorChecklistTemplateItem[]>([]);
  const [equipmentPreviewFields, setEquipmentPreviewFields] = useState<CapturedFieldValue[]>([]);
  const [locationCollectionEnabled, setLocationCollectionEnabled] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [complianceNotice, setComplianceNotice] = useState('');
  const [operatorValues, setOperatorValues] = useState<Record<string, unknown>>({});
  const [answers, setAnswers] = useState<Record<string, OperatorChecklistAnswer>>({});

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
    collectGps: locationCollectionEnabled && Boolean(token),
  });

  const grouped = useMemo(() => groupChecklistItemsBySection(items), [items]);
  const operatorFields = useMemo(
    () => dataFields.filter((field) => field.source === 'operator_input'),
    [dataFields],
  );
  const readOnlyFields = useMemo(
    () => dataFields.filter((field) => field.source !== 'operator_input'),
    [dataFields],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await loadOperatorCheckinForm(token);
        if (cancelled) return;
        setTemplateName(data.template.name);
        setDataFields(data.template.dataFields);
        setItems(data.template.checklistItems);
        setEquipmentPreviewFields(data.equipmentPreviewFields);
        setLocationCollectionEnabled(data.locationCollectionEnabled);
        setCaptchaRequired(data.captchaRequired);
        setComplianceNotice(data.complianceNotice);
      } catch {
        if (!cancelled) setLoadError('This check-in link is not available.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const answerList = useMemo(() => Object.values(answers), [answers]);
  const checklistValidation = useMemo(
    () => validateOperatorChecklistAnswers(items, answerList),
    [items, answerList],
  );
  const fieldValidation = useMemo(
    () => validateOperatorInputFields(dataFields, operatorValues),
    [dataFields, operatorValues],
  );

  const canSubmit =
    !captchaMisconfigured &&
    fieldValidation.isComplete &&
    checklistValidation.isComplete &&
    (!captchaRequired || hcaptchaToken !== null);

  const validationMessages = useMemo(
    () => [...fieldValidation.errors, ...checklistValidation.errors],
    [fieldValidation.errors, checklistValidation.errors],
  );

  const hasFormProgress = useMemo(() => {
    const hasOperatorInput = Object.values(operatorValues).some((value) => {
      if (value === undefined || value === null || value === '') return false;
      if (value === false) return false;
      return true;
    });
    return Object.keys(answers).length > 0 || hasOperatorInput || hcaptchaToken !== null;
  }, [answers, operatorValues, hcaptchaToken]);

  function getReadOnlyValue(field: OperatorChecklistDataField): string {
    if (field.source === 'equipment_snapshot') {
      const preview = equipmentPreviewFields.find((item) => item.field_id === field.id);
      return formatCapturedFieldValue(preview?.value);
    }
    if (field.source === 'client_context' && field.clientKey === 'gps_location') {
      if (gpsStatus === 'pending') return 'Requesting location…';
      if (gpsStatus === 'granted' && coords) return `${coords.lat}, ${coords.lng}`;
      if (gpsStatus === 'denied') return 'Not provided';
      return 'Not requested';
    }
    if (field.source === 'client_context' && field.clientKey === 'browser_timezone') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (field.source === 'client_context' && field.clientKey === 'submitted_timestamp') {
      return 'Recorded when you submit';
    }
    return '—';
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitOperatorCheckin({
        token,
        operatorFieldValues: operatorValues,
        checklistAnswers: answerList,
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location: coords ? `${coords.lat}, ${coords.lng}` : null,
        captchaToken: hcaptchaToken ?? undefined,
      });
      setSubmittedAt(result.submittedAt);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit check-in.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleAnswer(itemId: string, passed: boolean) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { item_id: itemId, passed },
    }));
  }

  function updateOperatorValue(fieldId: string, value: unknown) {
    setOperatorValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleResetForm() {
    setOperatorValues({});
    setAnswers({});
    setHcaptchaToken(null);
  }

  if (loading) {
    return <PublicFormLoadingState message="Loading check-in form…" />;
  }

  if (loadError) {
    return <PublicFormErrorState message={loadError} />;
  }

  if (submitted) {
    return (
      <PublicFormSuccessCard title="Check-in complete">
        <p>
          Your <strong className="text-foreground">{templateName}</strong> check-in was saved
          {submittedAt ? ` at ${formatPublicSubmittedAt(submittedAt)}` : ''}.
        </p>
        <p>{complianceNotice}</p>
        <p className="text-xs">You can close this page. Submit again tomorrow with the same QR code.</p>
      </PublicFormSuccessCard>
    );
  }

  return (
    <>
      <PageSEO title={`Daily Check-In — ${templateName}`} noindex />
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{templateName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily operator check-in</p>
          <p className="text-sm mt-2">
            <ExternalLink href={OPERATOR_DAILY_CHECK_INS_DOCS_URL}>
              What is a daily operator check-in?
            </ExternalLink>
          </p>
        </div>

        <Alert>
          <AlertDescription>{complianceNotice}</AlertDescription>
        </Alert>

        {captchaMisconfigured && (
          <Alert variant="destructive">
            <AlertDescription>
              This check-in form cannot accept submissions right now because CAPTCHA is not configured for this environment.
            </AlertDescription>
          </Alert>
        )}

        {(operatorFields.length > 0 || readOnlyFields.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Check-in details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {operatorFields.map((field) => (
                <PublicFormFieldInput
                  key={field.id}
                  fieldId={`operator-field-${field.id}`}
                  label={field.label}
                  inputType={field.inputType ?? 'text'}
                  required={field.required === true}
                  helpText={field.helpText}
                  value={operatorValues[field.id]}
                  onChange={(value) => updateOperatorValue(field.id, value)}
                />
              ))}
              {readOnlyFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <p className="text-sm font-medium">{field.label}</p>
                  {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                  <p className="text-sm text-muted-foreground">{getReadOnlyValue(field)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Swipe right for Pass, left for Fail. You can also tap Pass or Fail.
          </p>
        )}

        {Object.entries(grouped).map(([section, sectionItems]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionItems.map((item) => (
                <OperatorCheckinChecklistItemRow
                  key={item.id}
                  item={item}
                  answer={answers[item.id]}
                  onAnswer={(passed) => toggleAnswer(item.id, passed)}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {showCaptcha && (
          <HCaptchaComponent onVerify={setHcaptchaToken} onExpire={() => setHcaptchaToken(null)} />
        )}

        {validationMessages.length > 0 && (
          <Alert>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {captchaRequired && !hcaptchaToken && !captchaMisconfigured && (
          <p className="text-xs text-muted-foreground text-center">Complete the CAPTCHA below to submit.</p>
        )}

        {hasFormProgress && (
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px] touch-manipulation"
            onClick={handleResetForm}
          >
            Reset form
          </Button>
        )}

        <Button className="w-full" size="lg" disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
          {submitting ? 'Submitting…' : 'Submit daily check-in'}
        </Button>
      </div>
    </>
  );
}
