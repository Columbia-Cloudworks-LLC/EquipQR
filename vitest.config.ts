import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const isCI = process.env.CI === 'true';

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
    // Use forks pool for better process isolation and to prevent hanging on open handles
    // Threads pool can leave open handles that prevent process exit
    pool: 'forks',
    poolOptions: {
      forks: {
        // Single worker in CI to minimize memory usage
        maxForks: isCI ? 1 : undefined,
        minForks: isCI ? 1 : undefined,
        // Isolate each test file
        isolate: true,
      },
      threads: {
        isolate: true,
      },
    },
    // Completely sequential in CI to prevent OOM
    fileParallelism: !isCI,
    // Ensure hooks don't hang
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      // Use istanbul in CI for stability; v8 can hang on large codebases
      provider: isCI ? 'istanbul' : 'v8',
      // Reduce reporters in CI to save memory (skip html)
      // json reporter generates coverage-final.json for detailed PR comments
      reporter: isCI 
        ? ['text', 'lcov', 'json-summary', 'json'] 
        : ['text', 'json', 'html', 'lcov', 'json-summary'],
      all: false, // Only include files touched by tests
      include: ['src/**/*.{ts,tsx}'],
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
        'src/components/scanner/**',
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
        'src/utils/qrTestHelper.ts',
        
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
      thresholds: {
        // Phase 1 thresholds (increased from baseline)
        // Target: branches 80%, functions 75%, lines 80%, statements 80%
        global: {
          branches: 70,
          functions: 50, // Increased from 45%
          lines: 62,     // Increased from 60%
          statements: 62, // Increased from 60%
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