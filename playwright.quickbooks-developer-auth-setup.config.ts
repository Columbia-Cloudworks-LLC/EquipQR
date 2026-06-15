import { defineRealAuthSetupPlaywrightConfig } from './e2e/user/shared/real-auth-setup-playwright-config';

export default defineRealAuthSetupPlaywrightConfig({
  outputSubdir: 'quickbooks-developer-auth-setup',
  testMatch: /quickbooks-developer-auth\.setup\.ts/,
  use: {
    baseURL: undefined,
  },
});
