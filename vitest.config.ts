import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const isCI = process.env.CI === 'true';
// When sharding, thresholds apply to partial coverage and will always fail.
// The merged-report ratchet in coverage-ratchet.mjs handles threshold enforcement.
const isShardRun = process.argv.some((a) => a.startsWith('--shard='));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    testTimeout: 10000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['supabase/**', 'node_modules/**'],
    // Forks pool for process isolation; tuned to actually use the CI runner.
    // ubuntu-latest has 4 vCPUs and ~16GB. Single-fork sequential mode was
    // a legacy workaround for Supabase realtime / open-handle hangs that are
    // now mitigated by the global mock in src/test/setup.ts. Combined with
    // CI sharding (--shard=N/M), maxWorkers keeps fork count bounded while
    // exploiting parallelism (Vitest 4: poolOptions merged into top-level options).
    pool: 'forks',
    isolate: true,
    maxWorkers: isCI ? 2 : undefined,
    fileParallelism: true,
    // Ensure hooks don't hang
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      // v8 is significantly faster than istanbul. Keep v8 in both environments
      // so local and CI numbers agree (no more 15-20% under-reporting).
      provider: 'v8',
      // Trim reporters in CI to the minimum required by downstream consumers:
      //   - lcov         → Codecov upload
      //   - json-summary → PR comment action
      //   - json         → coverage-ratchet & detailed PR comment
      // text/html are interactive-only and add measurable overhead.
      reporter: isCI
        ? ['lcov', 'json-summary', 'json']
        : ['text', 'json', 'html', 'lcov', 'json-summary'],
      // Omit broad `include` / `all` so V8 coverage only instruments files the
      // suite actually loads; wide globs force remapping of untouched sources and
      // can hit Rollup parse errors on edge-syntax files under src/hooks/.
      exclude: [
        // Build/test infrastructure
        'node_modules/',
        'src/test/',
        'src/tests/',
        'scripts/**',
        'supabase/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        
        // Generated types
        'src/integrations/supabase/types.ts',
        
        // Entry point
        'src/main.tsx',
        
        // Static data
        'src/data/**',
        
        // UI Components (well-tested by usage, low business logic)
        'src/components/ui/**',
        'src/components/form/**',
        
        // Components with complex external dependencies
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
        
        // Contexts (tested via integration, will add unit tests later)
        'src/contexts/**',
        
        // Utilities with external dependencies or low coverage value
        'src/utils/pdfGenerator.ts',
        'src/utils/logger.ts',
        'src/utils/persistence.ts',
        'src/utils/restrictions.ts',
        'src/utils/billing/**',
        'src/utils/templatePDF.ts',
        'src/utils/navigationDebug.ts',
        'src/utils/invitationSystemValidation.ts',
        
        // Complex pages (will add journey tests)
        'src/pages/FleetMap.tsx',
        'src/pages/Reports.tsx',
        'src/pages/DebugAuth.tsx',
        'src/pages/Organization.tsx',
        'src/pages/EquipmentDetails.tsx',
        'src/pages/InventoryList.tsx',
        'src/pages/InventoryItemDetail.tsx',
        'src/pages/WorkOrderDetails.tsx',
        
        // Test files themselves
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/tests/**',
        '**/__tests__/**',
        
        // NOTE: Hooks and services are now INCLUDED in coverage
        // The following have been REMOVED from exclusions:
        // - 'src/hooks/**'
        // - 'src/services/**'  
        // - 'src/features/**/hooks/**'
        // - 'src/features/**/services/**'
      ],
      thresholds: isShardRun
        ? undefined
        : {
            // Current CI baseline (merged shards); must match scripts/coverage-ratchet.mjs DEFAULT_THRESHOLDS.
            // Long-term raise tracked in https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/816
            global: {
              branches: 47,
              functions: 50,
              lines: 55,
              statements: 54,
            },
          },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});