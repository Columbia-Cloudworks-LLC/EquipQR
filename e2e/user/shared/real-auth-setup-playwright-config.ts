import path from 'path';
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import { resolveRealAuthBaseUrl } from './real-auth-config';
import { RECORDING_VIEWPORT } from '../../../scripts/lib/recording-quality.mjs';

export interface RealAuthSetupPlaywrightOptions {
  outputSubdir: string;
  testMatch: RegExp;
  use?: PlaywrightTestConfig['use'];
}

export function defineRealAuthSetupPlaywrightConfig({
  outputSubdir,
  testMatch,
  use: useOverrides,
}: RealAuthSetupPlaywrightOptions) {
  const repoRoot = process.cwd();
  const outputDir = path.join(repoRoot, 'tmp', 'playwright', outputSubdir);

  return defineConfig({
    testDir: path.join(repoRoot, 'e2e', 'user', 'setup'),
    testMatch,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 1_200_000,
    expect: { timeout: 60_000 },
    outputDir,
    reporter: [['list']],
    use: {
      ...devices['Desktop Chrome'],
      headless: false,
      viewport: RECORDING_VIEWPORT,
      baseURL: resolveRealAuthBaseUrl(),
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: { mode: 'retain-on-failure' as const, size: RECORDING_VIEWPORT },
      ...useOverrides,
    },
  });
}
