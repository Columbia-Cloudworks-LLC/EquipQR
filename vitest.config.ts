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
      'src/integrations/supabase/types.ts',
      'scripts/**',
      'supabase/**',
      '**/*.d.ts',
      '**/*.config.*',
      '**/dist/**',
      'src/main.tsx', // Vite entry point
      'src/data/**', // Static data files
      'src/components/landing/**', // Landing page components
      'src/components/billing/**', // Billing components  
      'src/components/layout/**', // Layout components
      'src/components/migration/**', // Migration components
      'src/components/notifications/**', // Notification components
      'src/components/performance/**', // Performance components
      'src/components/qr/**', // QR components
      'src/components/reports/**', // Report components
      'src/components/scanner/**', // Scanner components
      'src/components/security/**', // Security components
      'src/components/session/**', // Session components
      'src/components/settings/**', // Settings components
      'src/components/common/**', // Common components
      'src/components/teams/**', // Teams components
      'src/components/equipment/csv-import/**', // Equipment CSV import wizard
      'src/components/ui/**', // UI primitives
      'src/components/equipment/CsvWizard.tsx', // Equipment CSV wizard
      'src/contexts/SettingsContext.tsx', // Settings context
      'src/contexts/TeamContext.tsx', // Team context
      'src/contexts/UserContext.tsx', // User context
      'src/hooks/**', // Hooks
      'src/services/**', // Service layer
      'src/utils/pdfGenerator.ts', // PDF generator utility
      'src/utils/logger.ts', // Logging utility
      'src/utils/persistence.ts', // Persistence utility
      'src/utils/restrictions.ts', // Restrictions helper
      'src/utils/billing/**', // Billing utilities
      'src/pages/FleetMap.tsx', // Fleet map page
      'src/pages/Reports.tsx', // Reports page
      // Exclude test files from coverage
      '**/*.test.{ts,tsx}',
      '**/tests/**',
      '**/*.spec.{ts,tsx}',
    ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
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