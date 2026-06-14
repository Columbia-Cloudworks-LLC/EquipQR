import { defineRealAuthSetupPlaywrightConfig } from './e2e/user/shared/real-auth-setup-playwright-config';

export default defineRealAuthSetupPlaywrightConfig({
  outputSubdir: 'google-auth-setup',
  testMatch: /google-real-auth\.setup\.ts/,
});
