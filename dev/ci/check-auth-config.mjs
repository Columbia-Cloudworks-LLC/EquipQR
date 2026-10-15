#!/usr/bin/env node
/**
 * Read-only guard for the hosted Supabase Auth settings that Done-For-You
 * claiming depends on (issue #1648 review).
 *
 * A staged yard is claimed by whoever proves control of the staged email.
 * That proof is auth.users.email_confirmed_at, which only means something
 * while mailer auto-confirm is off and the only sign-in methods are email and
 * Google. This check fails the release if either drifts.
 *
 * Prints only the names and values of the settings it checks. The full auth
 * config response contains secrets and is never logged.
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN  required
 *   SUPABASE_PROJECT_REF   required
 */

import { pathToFileURL } from 'node:url';

export const ALLOWED_PROVIDERS = new Set(['email', 'google']);

/**
 * @param {Record<string, unknown>} config  /v1/projects/{ref}/config/auth response
 * @returns {{ errors: string[], report: string[] }}
 */
export function evaluateAuthConfig(config) {
  const errors = [];
  const report = [];

  report.push(`mailer_autoconfirm: ${String(config.mailer_autoconfirm)}`);
  if (config.mailer_autoconfirm !== false) {
    errors.push('mailer_autoconfirm must be false: Done-For-You claiming trusts verified email only.');
  }

  report.push(`mailer_secure_email_change_enabled: ${String(config.mailer_secure_email_change_enabled)}`);
  if (config.mailer_secure_email_change_enabled !== true) {
    errors.push('mailer_secure_email_change_enabled must be true: changing to a staged email claims its yard.');
  }

  const enabled = Object.entries(config)
    .filter(([key, value]) => /^external_[a-z0-9_]+_enabled$/.test(key) && value === true)
    .map(([key]) => key.replace(/^external_/, '').replace(/_enabled$/, ''))
    .sort();
  report.push(`enabled sign-in methods: ${enabled.join(', ') || '(none)'}`);
  const unexpected = enabled.filter((name) => !ALLOWED_PROVIDERS.has(name));
  if (unexpected.length > 0) {
    errors.push(
      `Unexpected sign-in methods enabled (${unexpected.join(', ')}). Review whether they verify email ownership before allowing them here.`,
    );
  }

  return { errors, report };
}

export async function run({ env = process.env, fetchImpl = fetch } = {}) {
  const token = env.SUPABASE_ACCESS_TOKEN || '';
  const ref = env.SUPABASE_PROJECT_REF || '';
  if (!token || !ref) {
    process.stderr.write('::error title=auth-config::SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.\n');
    return 1;
  }

  const res = await fetchImpl(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    process.stderr.write(`::error title=auth-config::Reading auth config failed with HTTP ${res.status}.\n`);
    return 1;
  }

  const { errors, report } = evaluateAuthConfig(await res.json());
  process.stdout.write(`Supabase Auth settings (${ref})\n`);
  for (const line of report) process.stdout.write(`  ${line}\n`);
  for (const error of errors) process.stderr.write(`::error title=auth-config::${error}\n`);
  return errors.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`::error title=auth-config::${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    },
  );
}
