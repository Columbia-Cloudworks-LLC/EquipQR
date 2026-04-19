import { corsHeaders } from '../_shared/cors.ts';
import { withCorrelationId } from '../_shared/supabase-clients.ts';
import { MissingSecretError, requireSecret } from '../_shared/require-secret.ts';

const FUNCTION_NAME = 'verify-hcaptcha';

interface HCaptchaVerificationRequest {
  token: string;
  remoteip?: string;
}

interface HCaptchaVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Surface a missing secret as the standard MISSING_REQUIRED_SECRET log.
    const hcaptchaSecret = requireSecret('HCAPTCHA_SECRET_KEY', { functionName: FUNCTION_NAME });

    const { token, remoteip }: HCaptchaVerificationRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify the token with hCaptcha
    const formData = new FormData();
    formData.append('secret', hcaptchaSecret);
    formData.append('response', token);
    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const verificationResponse = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result: HCaptchaVerificationResponse = await verificationResponse.json();

    console.log('hCaptcha verification result:', result);

    return new Response(
      JSON.stringify({
        success: result.success,
        error: result.success ? null : 'CAPTCHA verification failed',
      }),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    if (error instanceof MissingSecretError) {
      // Structured MISSING_REQUIRED_SECRET log already emitted by the helper.
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    console.error('hCaptcha verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Verification failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}));
