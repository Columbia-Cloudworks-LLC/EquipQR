/**
 * Drift guard: buildOAuthCallbackRedirectUri exists in the browser
 * (src/services/oauthSessionHelpers.ts) and in Deno (./oauth-redirect-base.ts).
 * Both must produce the same callback URI, or Google/Intuit reject the
 * redirect_uri at token exchange.
 */
import { describe, expect, it } from 'vitest';
import { buildOAuthCallbackRedirectUri as clientBuild } from '@/services/oauthSessionHelpers';
import { buildOAuthCallbackRedirectUri as edgeBuild } from './oauth-redirect-base.ts';

const BASES = [
  'https://supabase.equipqr.app',
  'https://supabase.equipqr.app/',
  'https://supabase.equipqr.app///',
  '  https://abc.supabase.co  ',
  'http://127.0.0.1:54321',
];
const PATHS = [
  '/functions/v1/quickbooks-oauth-callback',
  'functions/v1/google-workspace-oauth-callback',
  '/',
  '',
];

describe('buildOAuthCallbackRedirectUri mirror (client ↔ edge)', () => {
  it('produces the same URI for every base and path', () => {
    for (const base of BASES) {
      for (const path of PATHS) {
        expect(edgeBuild(base, path), `${base} + ${path}`).toBe(clientBuild(base, path));
      }
    }
  });
});
