import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyManagedBlock,
  buildLocalOverrideLines,
  parseStatusEnv,
  publicSyncSummary,
  writeManagedEnvFile,
} from './sync-local-supabase-env.mjs';

const statusText = `
ANON_KEY="local-anon-key"
SERVICE_ROLE_KEY="local-service-key"
API_URL="http://127.0.0.1:54321"
`;

describe('local Supabase env sync', () => {
  it('parses quoted supabase status env lines', () => {
    expect(parseStatusEnv(statusText)).toEqual({
      ANON_KEY: 'local-anon-key',
      SERVICE_ROLE_KEY: 'local-service-key',
      API_URL: 'http://127.0.0.1:54321',
    });
  });

  it('writes local keys into a managed block and replaces stale copies', () => {
    const status = parseStatusEnv(statusText);
    const lines = buildLocalOverrideLines(status, 54321);
    const first = applyManagedBlock('VITE_SUPABASE_URL=https://example.supabase.co\n', lines.appLines, lines.appKeys);
    const second = applyManagedBlock(first, lines.appLines, lines.appKeys);
    expect(second.match(/EQUIPQR LOCAL SUPABASE OVERRIDES/g)).toHaveLength(2);
    expect(second).toContain('VITE_SUPABASE_ANON_KEY=local-anon-key');
    expect(second).not.toContain('https://example.supabase.co');
    expect(publicSyncSummary(54321)).toBe('Updated local env overrides for Supabase API port 54321.');
    expect(publicSyncSummary(54321)).not.toContain('local-anon-key');
    expect(publicSyncSummary(54321)).not.toContain('local-service-key');
  });

  it('refuses to build overrides when local keys are missing', () => {
    expect(() => buildLocalOverrideLines({ API_URL: 'http://127.0.0.1:54321' }, 54321)).toThrow(
      /ANON_KEY and SERVICE_ROLE_KEY/,
    );
  });

  it('keeps the service role key out of the app env file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'equipqr-env-'));
    const appFile = path.join(dir, '.env.local');
    const lines = buildLocalOverrideLines(parseStatusEnv(statusText), 54321);
    writeManagedEnvFile(appFile, lines.appLines, lines.appKeys);
    writeManagedEnvFile(appFile, lines.appLines, lines.appKeys);
    const written = fs.readFileSync(appFile, 'utf8');
    expect(written.match(/EQUIPQR LOCAL SUPABASE OVERRIDES/g)).toHaveLength(2);
    expect(written).toContain('VITE_SUPABASE_ANON_KEY=local-anon-key');
    expect(written).not.toContain('local-service-key');
  });
});
