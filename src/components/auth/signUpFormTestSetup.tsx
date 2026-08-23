import { vi } from 'vitest';

vi.stubEnv('VITE_HCAPTCHA_SITEKEY', 'test-hcaptcha-site-key');

vi.mock('@/lib/hibpPasswordCheck', () => ({
  checkPasswordBreachedHibp: vi.fn(() => Promise.resolve({ status: 'ok' as const, breached: false })),
}));

vi.mock('@/services/authSignupService', () => ({
  signUpWithEmail: vi.fn(),
  getCurrentAuthSession: vi.fn(),
}));

vi.mock('@/components/ui/HCaptcha', () => ({
  default: ({
    onSuccess,
    onError,
    onExpire,
  }: {
    onSuccess: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
  }) => (
    <div role="group" aria-label="hCaptcha">
      <button type="button" onClick={() => onSuccess('mock-captcha-token')}>
        Verify Captcha
      </button>
      <button type="button" onClick={() => onError?.()}>
        Trigger Error
      </button>
      <button type="button" onClick={() => onExpire?.()}>
        Trigger Expire
      </button>
    </div>
  ),
}));
