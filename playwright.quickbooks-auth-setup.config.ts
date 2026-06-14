import fs from 'fs';
import path from 'path';
import { DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH } from './e2e/user/shared/real-auth-config';
import { defineRealAuthSetupPlaywrightConfig } from './e2e/user/shared/real-auth-setup-playwright-config';

const googleStoragePath = path.resolve(DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH);

export default defineRealAuthSetupPlaywrightConfig({
  outputSubdir: 'quickbooks-auth-setup',
  testMatch: /quickbooks-local-auth\.setup\.ts/,
  use: {
    storageState: fs.existsSync(googleStoragePath) ? googleStoragePath : undefined,
  },
});
