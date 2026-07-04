import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import { Checkbox } from '@/components/ui/checkbox';
import HCaptchaComponent from '@/components/ui/HCaptcha';
import { PageSEO } from '@/components/seo/PageSEO';
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

function renderOperatorInput(
  field: OperatorChecklistDataField,
  value: unknown,
  onChange: (fieldId: string, value: unknown) => void,
) {
  const inputType = field.inputType ?? 'text';
  const fieldId = `operator-field-${field.id}`;

  if (inputType === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={fieldId}
          checked={value === true}
          onCheckedChange={(checked) => onChange(field.id, checked === true)}
        />
        <Label htmlFor={fieldId}>{field.label}</Label>
      </div>
    );
  }

  if (inputType === 'textarea') {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{field.label}{field.required ? ' *' : ''}</Label>
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        <Textarea
          id={fieldId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{field.label}{field.required ? ' *' : ''}</Label>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      <Input
        id={fieldId}
        type={inputType === 'number' ? 'number' : inputType === 'date' ? 'date' : 'text'}
        inputMode={inputType === 'number' ? 'decimal' : undefined}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={(e) =>
          onChange(
            field.id,
            inputType === 'number'
              ? e.target.value.trim() === ''
                ? ''
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    </div>
  );
}

function formatSubmittedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

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
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');

  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined;
  const showCaptcha = captchaRequired && Boolean(hcaptchaSiteKey);
  const captchaMisconfigured = captchaRequired && !hcaptchaSiteKey;

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

  useEffect(() => {
    if (!locationCollectionEnabled || !token) return;
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
  }, [locationCollectionEnabled, token]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading check-in form…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <CardTitle>Check-in complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground text-center">
            <p>
              Your <strong className="text-foreground">{templateName}</strong> check-in was saved
              {submittedAt ? ` at ${formatSubmittedAt(submittedAt)}` : ''}.
            </p>
            <p>{complianceNotice}</p>
            <p className="text-xs">You can close this page. Submit again tomorrow with the same QR code.</p>
          </CardContent>
        </Card>
      </div>
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
                <div key={field.id}>
                  {renderOperatorInput(field, operatorValues[field.id], updateOperatorValue)}
                </div>
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

        {Object.entries(grouped).map(([section, sectionItems]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionItems.map((item) => {
                const answer = answers[item.id];
                return (
                  <div key={item.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        {item.required && (
                          <p className="text-xs text-muted-foreground">Required</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`pass-${item.id}`}
                          checked={answer?.passed === true}
                          onCheckedChange={() => toggleAnswer(item.id, true)}
                        />
                        <Label htmlFor={`pass-${item.id}`}>Pass</Label>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`fail-${item.id}`}
                          checked={answer?.passed === false}
                          onCheckedChange={() => toggleAnswer(item.id, false)}
                        />
                        <Label htmlFor={`fail-${item.id}`}>Fail</Label>
                      </div>
                    </div>
                  </div>
                );
              })}
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

        <Button className="w-full" size="lg" disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
          {submitting ? 'Submitting…' : 'Submit daily check-in'}
        </Button>
      </div>
    </>
  );
}
