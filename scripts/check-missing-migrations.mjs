import path from 'path';
import { fileURLToPath } from 'url';
import { reportMissingProductionMigrations } from './lib/migration-catalog.mjs';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

reportMissingProductionMigrations(MIGRATIONS_DIR);
