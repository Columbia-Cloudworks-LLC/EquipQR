/**
 * Records signup Terms + Privacy acceptance with IP / User-Agent evidence.
 * Authenticated users only; inserts via service role.
 */
import { corsHeaders } from '../_shared/cors.ts';
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  requireUser,
  withCorrelationId,
} from '../_shared/supabase-clients.ts';
import { MissingSecretError } from '../_shared/require-secret.ts';

const FUNCTION_NAME = 'record-terms-acceptance';

interface Body {
  terms_version_hash: string;
  privacy_version_hash: string;
  accepted_at?: string;
}

Deno.serve(
  withCorrelationId(async (req, _ctx) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const userClient = createUserSupabaseClient(req);
      const auth = await requireUser(req, userClient);
      if ('error' in auth) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = (await req.json()) as Body;
      const termsHash = typeof body.terms_version_hash === 'string' ? body.terms_version_hash.trim() : '';
      const privacyHash =
        typeof body.privacy_version_hash === 'string' ? body.privacy_version_hash.trim() : '';

      if (!termsHash || !privacyHash || termsHash.length > 256 || privacyHash.length > 256) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid version hashes' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const forwarded = req.headers.get('x-forwarded-for');
      const ip =
        forwarded?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip')?.trim() ||
        'unknown';
      const userAgent = req.headers.get('user-agent')?.slice(0, 2000) || 'unknown';

      let acceptedAt = new Date().toISOString();
      if (body.accepted_at) {
        const parsed = Date.parse(body.accepted_at);
        if (!Number.isNaN(parsed)) {
          acceptedAt = new Date(parsed).toISOString();
        }
      }

      const admin = createAdminSupabaseClient();
      const { error } = await admin.from('terms_acceptances').insert({
        user_id: auth.user.id,
        accepted_at: acceptedAt,
        ip_address: ip,
        user_agent: userAgent,
        terms_version_hash: termsHash,
        privacy_version_hash: privacyHash,
      });

      if (error) {
        console.error(`[${FUNCTION_NAME}] insert error`, error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to record acceptance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      if (e instanceof MissingSecretError) {
        return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error(`[${FUNCTION_NAME}]`, e);
      return new Response(JSON.stringify({ success: false, error: 'Unexpected error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }),
);
