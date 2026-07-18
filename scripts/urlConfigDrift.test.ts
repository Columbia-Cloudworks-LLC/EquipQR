import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const RETIRED_HOST = 'supabase.preview.equipqr.app';

const ALLOWLIST_SUFFIXES = [
  'src/services/oauthSessionHelpers.ts',
  'supabase/functions/_shared/oauth-redirect-base.ts',
  'src/services/quickbooks/auth.test.ts',
  'src/services/google-workspace/auth.test.ts',
  'supabase/functions/quickbooks-oauth-callback/quickbooks-oauth-callback.deno.test.ts',
  'supabase/functions/google-workspace-oauth-callback/google-workspace-oauth-callback.deno.test.ts',
  'supabase/functions/_shared/oauth-redirect-base.deno.test.ts',
  'docs/ops/playwright-real-auth-integrations.md',
  'docs/ops/url-config-external-cleanup.md',
  'AGENTS.md',
  // This file defines RETIRED_HOST for the guard assertion itself.
  'scripts/urlConfigDrift.test.ts',
];

const SCAN_ROOTS = [
  'scripts',
  'docs',
  '.env.example',
  '.github/secrets-map.yml',
  'src/services/quickbooks/auth.ts',
  'src/services/google-workspace/auth.ts',
];

function collectFiles(rootPath: string, files: string[] = []): string[] {
  if (!statSync(rootPath, { throwIfNoEntry: false })?.isDirectory()) {
    files.push(rootPath);
    return files;
  }

  for (const entry of readdirSync(rootPath)) {
    const fullPath = join(rootPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      collectFiles(fullPath, files);
      continue;
    }

    if (/\.(md|ps1|sh|yml|yaml|example|ts|tsx|json)$/i.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isAllowlisted(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWLIST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

describe('url config drift guard', () => {
  it('does not reintroduce retired preview Supabase hostname outside compat allowlist', () => {
    const workspaceRoot = process.cwd();
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      const absoluteRoot = join(workspaceRoot, root);
      for (const filePath of collectFiles(absoluteRoot)) {
        if (isAllowlisted(filePath)) continue;
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes(RETIRED_HOST)) {
          offenders.push(filePath.replace(/\\/g, '/').replace(`${workspaceRoot.replace(/\\/g, '/')}/`, ''));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
