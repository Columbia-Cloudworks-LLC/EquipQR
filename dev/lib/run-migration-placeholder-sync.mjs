import path from 'path';
import { fileURLToPath } from 'url';
import { runProductionMigrationPlaceholderSync } from './migration-catalog.mjs';

/**
 * @param {import('url').URL['href']} importMetaUrl
 * @param {Omit<Parameters<typeof runProductionMigrationPlaceholderSync>[0], 'migrationsDir'>} options
 */
export function runMigrationPlaceholderSyncFromScript(importMetaUrl, options) {
  const migrationsDir = path.join(path.dirname(fileURLToPath(importMetaUrl)), '..', 'supabase', 'migrations');
  return runProductionMigrationPlaceholderSync({ migrationsDir, ...options });
}
