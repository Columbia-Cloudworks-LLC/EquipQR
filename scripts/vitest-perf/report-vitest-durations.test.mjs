import { describe, expect, it } from 'vitest';
import {
  aggregateVitestDurations,
  formatDurationMarkdown,
  formatDurationReport,
  normalizeTestFilePath,
  parseCliArgs,
  sanitizePositiveInt,
} from './report-vitest-durations.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('report-vitest-durations', () => {
  it('normalizes CI absolute paths to repo-relative', () => {
    expect(
      normalizeTestFilePath(
        '/home/runner/work/EquipQR/EquipQR/src/features/inventory/pages/InventoryList.test.tsx',
      ),
    ).toBe('src/features/inventory/pages/InventoryList.test.tsx');
  });

  it('sanitizes non-finite top limits to defaults', () => {
    expect(sanitizePositiveInt(Number.NaN, 25)).toBe(25);
    expect(sanitizePositiveInt(-3, 30)).toBe(30);
    expect(sanitizePositiveInt(12.8, 25)).toBe(12);
  });

  it('parses markdown and github-summary flags', () => {
    const cli = parseCliArgs(['--markdown', '--github-summary', '--top-files=5', 'tmp/results']);
    expect(cli.markdown).toBe(true);
    expect(cli.githubSummary).toBe(true);
    expect(cli.topFiles).toBe(5);
    expect(cli.paths).toEqual(['tmp/results']);
  });

  it('aggregates assertion durations and formats markdown offenders', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-perf-'));
    try {
      const shard = path.join(dir, 'shard-1.json');
      fs.writeFileSync(
        shard,
        JSON.stringify({
          testResults: [
            {
              name: '/home/runner/work/EquipQR/EquipQR/src/a.test.tsx',
              assertionResults: [
                { fullName: 'a slow', duration: 400, status: 'passed' },
                { fullName: 'a fast', duration: 50 },
              ],
            },
            {
              name: '/home/runner/work/EquipQR/EquipQR/src/b.test.tsx',
              assertionResults: [{ fullName: 'b mid', duration: 200, status: 'passed' }],
            },
          ],
        }),
        'utf8',
      );

      const report = aggregateVitestDurations([shard], { slowMs: 200 });
      expect(report.summary.tests).toBe(3);
      expect(report.summary.overSlowMs).toBe(2);
      expect(report.files[0].file).toBe('src/a.test.tsx');
      expect(report.files[0].ms).toBe(450);
      expect(report.files[0].fails).toBe(1);
      expect(report.tests.find((t) => t.title === 'a fast')?.status).toBe('unknown');
      expect(report.tests[0].title).toBe('a slow');

      const text = formatDurationReport(report, { topFiles: 2, topTests: 2 });
      expect(text).toContain('src/a.test.tsx');
      expect(text).toContain('a slow');

      const md = formatDurationMarkdown(report, { topFiles: 2, topTests: 2 });
      expect(md).toContain('## Vitest Duration Report');
      expect(md).toContain('Worst offenders');
      expect(md).toContain('a slow');
      expect(md).toContain('| 400 |');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
