import { runMigrationPlaceholderSyncFromScript } from './lib/run-migration-placeholder-sync.mjs';

runMigrationPlaceholderSyncFromScript(import.meta.url, {
  opener: '🔍 Checking for missing migration files on main branch...\n',
  remoteCountLabel: 'Production migrations',
  successFooter: '💡 These files ensure local migrations match the remote database state.',
});
