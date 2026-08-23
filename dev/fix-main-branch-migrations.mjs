import path from 'path';
import { fileURLToPath } from 'url';
import { runProductionMigrationVersionsPlaceholderSync } from './lib/migration-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

runProductionMigrationVersionsPlaceholderSync({
  migrationsDir: MIGRATIONS_DIR,
  opener: '🔍 Checking main branch migrations against production...\n',
  remoteCountLabel: 'Production migrations',
  successFooter: '💡 Commit these files to fix the deployment error.',
  existsMessage: (filename) => `⚠️  ${filename} already exists (unexpected)`,
  exitOnMissingDir: true,
  exitWhenCreated: true,
});
