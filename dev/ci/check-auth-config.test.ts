import { describe, expect, it } from 'vitest';
import { evaluateAuthConfig } from '@/dev/ci/check-auth-config.mjs';

const SAFE = {
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  external_email_enabled: true,
  external_google_enabled: true,
  external_github_enabled: false,
  external_phone_enabled: false,
};

describe('evaluateAuthConfig', () => {
  it('passes the current production posture', () => {
    expect(evaluateAuthConfig(SAFE).errors).toEqual([]);
  });

  it('fails when mailer auto-confirm is turned on', () => {
    expect(evaluateAuthConfig({ ...SAFE, mailer_autoconfirm: true }).errors[0]).toMatch(/mailer_autoconfirm/);
  });

  it('fails when the setting is missing', () => {
    const { mailer_autoconfirm: _omit, ...rest } = SAFE;
    expect(evaluateAuthConfig(rest).errors.length).toBeGreaterThan(0);
  });

  it('fails when secure email change is off', () => {
    expect(evaluateAuthConfig({ ...SAFE, mailer_secure_email_change_enabled: false }).errors).toHaveLength(1);
  });

  it('fails on an unreviewed sign-in method', () => {
    const { errors, report } = evaluateAuthConfig({ ...SAFE, external_azure_enabled: true });
    expect(errors[0]).toMatch(/azure/);
    expect(report).toContain('enabled sign-in methods: azure, email, google');
  });

  it('never reports values other than the checked settings', () => {
    const { report } = evaluateAuthConfig({ ...SAFE, smtp_pass: 'super-secret' });
    expect(report.join('\n')).not.toMatch(/super-secret/);
  });
});
