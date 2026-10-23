import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkRootLayout } from './check-root-layout.mjs';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('checkRootLayout', () => {
  it('passes for the current repository layout', () => {
    expect(checkRootLayout()).toEqual([]);
  });

  it('rejects unapproved scripts in dev/ and unexpected root directories', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'equipqr-layout-'));
    tempDirs.push(tmp);

    fs.mkdirSync(path.join(tmp, 'dev'), { recursive: true });
    fs.mkdirSync(path.join(tmp, '.audit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'dev', 'test-runner.mjs'), '// allowed\n');
    fs.writeFileSync(path.join(tmp, 'dev', 'test-runner.test.ts'), '// colocated test allowed\n');
    fs.writeFileSync(path.join(tmp, 'dev', 'fix-issue-9999.sql'), '-- rogue hotfix\n');

    const errors = checkRootLayout({
      rootDir: tmp,
      layout: {
        rootAllowedFiles: [],
        rootAllowedDirs: ['dev'],
        rootIgnoredNames: [],
        devAllowedFiles: ['test-runner.mjs'],
        devAllowedDirs: [],
        imageMustLiveUnder: 'public/images/',
        imageExceptions: [],
      },
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'unexpected root directory: .audit',
        expect.stringContaining('unexpected dev/ script or file: dev/fix-issue-9999.sql'),
      ]),
    );
  });
});
