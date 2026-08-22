import { runMigrationPlaceholderSyncFromScript } from './lib/run-migration-placeholder-sync.mjs';

runMigrationPlaceholderSyncFromScript(import.meta.url, {
  opener: '🔍 Checking for missing migration files...\n',
  remoteCountLabel: 'Expected migrations (from main)',
  successFooter: '💡 These files ensure local migrations match the remote database state.',
});
