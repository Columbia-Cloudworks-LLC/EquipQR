/**
 * Records signup Terms + Privacy acceptance with IP / User-Agent evidence.
 * Authenticated users only; inserts via service role.
 */
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  requireUser,
  withCorrelationId,
  handleCorsPreflightIfNeeded,
  createJsonResponse,
  createErrorResponse,
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
    const corsPreflight = handleCorsPreflightIfNeeded(req);
    if (corsPreflight) return corsPreflight;

    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405, { req });
    }

    try {
      const userClient = createUserSupabaseClient(req);
      const auth = await requireUser(req, userClient);
      if ('error' in auth) {
        return createErrorResponse(auth.error, auth.status, { req });
      }

      let body: Body;
      try {
        body = (await req.json()) as Body;
      } catch {
        return createErrorResponse('Invalid JSON body', 400, { req });
      }

      const termsHash = typeof body.terms_version_hash === 'string' ? body.terms_version_hash.trim() : '';
      const privacyHash =
        typeof body.privacy_version_hash === 'string' ? body.privacy_version_hash.trim() : '';

      if (!termsHash || !privacyHash || termsHash.length > 256 || privacyHash.length > 256) {
        return createErrorResponse('Invalid request body: legal version hashes invalid', 400, { req });
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
        return createErrorResponse('Failed to record legal acceptance', 500, { req });
      }

      return createJsonResponse({ success: true }, 200, { req });
    } catch (e) {
      if (e instanceof MissingSecretError) {
        return createErrorResponse(e, 500, { req });
      }
      console.error(`[${FUNCTION_NAME}]`, e);
      return createErrorResponse('An unexpected error occurred', 500, { req });
    }
  }),
);
