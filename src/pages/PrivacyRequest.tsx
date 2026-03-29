import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSEO } from '@/components/seo/PageSEO';
import { supabase } from '@/integrations/supabase/client';
import HCaptchaComponent from '@/components/ui/HCaptcha';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUEST_TYPES = [
  { value: 'access', label: 'Access My Data' },
  { value: 'deletion', label: 'Delete My Data' },
  { value: 'correction', label: 'Correct My Data' },
  { value: 'opt_out', label: 'Do Not Sell or Share My Personal Information' },
  { value: 'limit_use', label: 'Limit Use of Sensitive Personal Information' },
] as const;

export default function PrivacyRequest() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [requestType, setRequestType] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);

  const hcaptchaEnabled = Boolean(import.meta.env.VITE_HCAPTCHA_SITEKEY);

  const isValid =
    fullName.trim().length > 0 &&
    EMAIL_PATTERN.test(email) &&
    requestType.length > 0 &&
    (!hcaptchaEnabled || hcaptchaToken !== null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-privacy-request`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            requestType,
            details: details.trim() || undefined,
            captchaToken: hcaptchaToken,
          }),
        },
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to submit request');
      }

      toast.success(
        'Your privacy request has been submitted. We will respond within 45 days.',
      );
      setSubmitted(true);
    } catch (err) {
      const fallbackMessage = 'Failed to submit privacy request. Please try again.';
      const baseMessage = err instanceof Error ? err.message : fallbackMessage;
      const userMessage =
        baseMessage === 'Failed to submit request'
          ? 'Unable to reach the privacy request service right now. Please try again in a moment.'
          : baseMessage;
      setSubmitError(userMessage);
      toast.error(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageSEO
        title="Privacy Request"
        description="Submit a data subject request to EquipQR. Access, delete, correct your personal data, or limit use of sensitive personal information under CCPA/CPRA."
        path="/privacy-request"
      />

      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Request</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Use this form to exercise your data privacy rights under the California Consumer
            Privacy Act (CCPA) and the California Privacy Rights Act (CPRA). You may request
            access to, deletion of, or correction of your personal information, opt out of
            the sale or sharing of your personal information, or ask us to limit the use of
            your sensitive personal information.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Submit a Request</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-lg font-medium">
                  Thank you. Your request has been received.
                </p>
                <p className="text-muted-foreground">
                  We will verify your identity and respond within 45 calendar days as required
                  by law. If we need additional time, we will notify you.
                </p>
                <div className="flex justify-center gap-4 pt-4">
                  <Button variant="outline" asChild>
                    <Link to="/privacy-policy">View Privacy Policy</Link>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFullName('');
                      setEmail('');
                      setRequestType('');
                      setDetails('');
                      setHcaptchaToken(null);
                      setSubmitted(false);
                    }}
                  >
                    Submit Another Request
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requestType">
                    Request Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={requestType} onValueChange={setRequestType} required>
                    <SelectTrigger id="requestType">
                      <SelectValue placeholder="Select a request type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Additional Details</Label>
                  <Textarea
                    id="details"
                    placeholder="Provide any additional context that may help us process your request (optional)."
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>

                {hcaptchaEnabled && (
                  <HCaptchaComponent
                    onSuccess={(token) => setHcaptchaToken(token)}
                    onError={() => setHcaptchaToken(null)}
                    onExpire={() => setHcaptchaToken(null)}
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-destructive">*</span> Required fields
                  </p>
                  <Button type="submit" disabled={!isValid || isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
                {submitError ? (
                  <p role="alert" aria-live="polite" className="text-sm text-destructive">
                    {submitError}
                  </p>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Under the CCPA/CPRA, California residents have the right to:
            </p>
            <ul>
              <li>
                <strong>Know and access</strong> the personal information we have collected
                about you.
              </li>
              <li>
                <strong>Delete</strong> your personal information, subject to certain
                exceptions.
              </li>
              <li>
                <strong>Correct</strong> inaccurate personal information we hold about you.
              </li>
              <li>
                <strong>Opt out</strong> of the sale or sharing of your personal information
                for cross-context behavioral advertising.
              </li>
              <li>
                <strong>Limit the use</strong> of your sensitive personal information to
                purposes necessary to provide the services you requested.
              </li>
              <li>
                <strong>Non-discrimination</strong> for exercising your privacy rights.
              </li>
            </ul>
            <p>
              We do not sell or share personal information for cross-context behavioral
              advertising. For full details about our data practices, see our{' '}
              <Link to="/privacy-policy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
