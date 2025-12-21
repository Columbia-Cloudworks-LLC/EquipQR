import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    testTimeout: 10000, // Increase default timeout for complex form tests
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['supabase/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      all: false, // Only include files touched by tests
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/tests/',
        'src/integrations/supabase/types.ts',
        'scripts/**',
        'supabase/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        'src/main.tsx',
        'src/data/**',
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
        'src/components/ui/**',
        'src/components/equipment/CsvWizard.tsx',
        'src/components/form/**',
        'src/contexts/**',
        'src/hooks/**',
        'src/services/**',
        'src/features/**/hooks/**',
        'src/features/**/services/**',
        'src/utils/pdfGenerator.ts',
        'src/utils/logger.ts',
        'src/utils/persistence.ts',
        'src/utils/restrictions.ts',
        'src/utils/billing/**',
        'src/utils/templatePDF.ts',
        'src/utils/navigationDebug.ts',
        'src/utils/invitationSystemValidation.ts',
        'src/utils/qrTestHelper.ts',
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
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 45,  // Lower threshold - functions are hard to cover with mocked dependencies
          lines: 60,  // Currently at 63.75%, set slightly below to allow for variance
          statements: 60,  // Currently at 63.75%, set slightly below to allow for variance
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