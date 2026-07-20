import { describe, expect, it } from 'vitest';
import { extractCliJson } from './seed-quick-login.mjs';

describe('extractCliJson', () => {
  it('extracts branch JSON despite ANSI spinner noise and stray brackets', () => {
    const noisy = [
      '\u001b[1G\u001b[J[ spinner noise',
      'Created preview branch:',
      '{',
      '  "name": "agent-demo",',
      '  "project_ref": "abcdefghijklmnop",',
      '  "status": "FUNCTIONS_DEPLOYED",',
      '  "preview_project_status": "ACTIVE_HEALTHY"',
      '}',
    ].join('\n');

    const parsed = extractCliJson(noisy);
    expect(parsed.project_ref).toBe('abcdefghijklmnop');
    expect(parsed.name).toBe('agent-demo');
  });
});
