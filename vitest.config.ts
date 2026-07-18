import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { platform } from 'node:os';

const isCI = process.env.CI === 'true';
const isWindows = platform() === 'win32';
const isShardRun = process.argv.some((a) => a.startsWith('--shard='));

/** Shard-safe JSON results path so parallel CI jobs do not overwrite one file. */
function resolveVitestResultsJsonPath(): string {
  const resultsDir = path.resolve(__dirname, 'artifacts', 'vitest-results');
  fs.mkdirSync(resultsDir, { recursive: true });

  const shardArg = process.argv.find((a) => a.startsWith('--shard='));
  if (!shardArg) {
    return path.join(resultsDir, 'results.json');
  }
  const [shardIndex] = shardArg.replace('--shard=', '').split('/');
  return path.join(resultsDir, `shard-${shardIndex}.json`);
}

/** Co-located .test.ts files that need jsdom (hooks, browser APIs, RTL renderHook). */
const JSDOM_TS_TEST_GLOBS = [
  'src/hooks/**/*.test.ts',
  'src/**/hooks/**/*.test.ts',
  'src/utils/**/*.test.ts',
  'src/services/**/*.test.ts',
  'src/components/**/*.test.ts',
  'src/contexts/**/*.test.ts',
  'src/pages/**/*.test.ts',
  // Browser APIs (AudioContext / vibrate) — former lib/__tests__ suites
  'src/lib/scanFeedback.test.ts',
];

const coverageExclude = [
  'node_modules/',
  'vitest/',
  'scripts/**',
  'supabase/**',
  'e2e/**',
  '**/*.d.ts',
  '**/*.config.*',
  '**/dist/**',
  'src/integrations/supabase/types.ts',
  'src/main.tsx',
  'src/data/**',
  'src/components/ui/**',
  'src/components/form/**',
  'src/components/landing/**',
  'src/components/billing/**',
  'src/components/layout/**',
  'src/components/migration/**',
  'src/components/notifications/**',
  'src/components/performance/**',
  'src/components/qr/**',
  'src/components/reports/**',
  'src/components/security/**',
  'src/components/session/**',
  'src/components/settings/**',
  'src/components/common/**',
  'src/components/teams/**',
  'src/components/equipment/csv-import/**',
  'src/components/equipment/CsvWizard.tsx',
  'src/contexts/**',
  'src/utils/pdfGenerator.ts',
  'src/utils/logger.ts',
  'src/utils/persistence.ts',
  'src/utils/restrictions.ts',
  'src/utils/billing/**',
  'src/utils/templatePDF.ts',
  'src/utils/navigationDebug.ts',
  'src/utils/invitationSystemValidation.ts',
  'src/pages/FleetMap.tsx',
  'src/pages/Reports.tsx',
  'src/pages/DebugAuth.tsx',
  'src/pages/Organization.tsx',
  'src/pages/EquipmentDetails.tsx',
  'src/pages/InventoryList.tsx',
  'src/pages/InventoryItemDetail.tsx',
  'src/pages/WorkOrderDetails.tsx',
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  '**/tests/**',
  '**/__tests__/**',
];

const unitInclude = [
  'src/**/*.test.ts',
  'src/**/*.spec.ts',
  'scripts/**/*.test.ts',
  'scripts/**/*.test.mjs',
  'e2e/**/*.test.ts',
  'vitest/**/*.test.ts',
  'supabase/functions/_shared/**/*.vitest.test.ts',
];

const componentInclude = [
  'src/**/*.test.tsx',
  'src/**/*.spec.tsx',
  'vitest/**/*.test.tsx',
  ...JSDOM_TS_TEST_GLOBS,
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    css: true,
    testTimeout: 10000,
    // Visibility/flagging only — does not fail the run (see #1349 / #1314).
    slowTestThreshold: 200,
    reporters: ['default', 'json'],
    outputFile: {
      json: resolveVitestResultsJsonPath(),
    },
    exclude: ['**/*.deno.test.ts', 'node_modules/**'],
    pool: 'forks',
    isolate: true,
    fileParallelism: isWindows ? false : isCI ? false : true,
    maxWorkers: isWindows ? 1 : isCI ? 1 : undefined,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: isCI
        ? ['lcov', 'json-summary', 'json']
        : ['text', 'json', 'html', 'lcov', 'json-summary'],
      exclude: coverageExclude,
      thresholds: isShardRun
        ? undefined
        : {
            global: {
              branches: 47,
              functions: 50,
              lines: 55,
              statements: 54,
            },
          },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: unitInclude,
          exclude: [...JSDOM_TS_TEST_GLOBS, '**/*.deno.test.ts', 'node_modules/**'],
          setupFiles: ['./vitest/setup-shared.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: componentInclude,
          exclude: ['**/*.deno.test.ts', 'node_modules/**'],
          setupFiles: ['./vitest/setup-shared.ts', './vitest/setup.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vitest-harness': path.resolve(__dirname, './vitest'),
    },
  },
});
