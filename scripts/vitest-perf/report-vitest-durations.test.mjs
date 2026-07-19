import { describe, expect, it } from 'vitest';
import {
  aggregateVitestDurations,
  formatDurationReport,
  normalizeTestFilePath,
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

  it('aggregates assertion durations across shard files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-perf-'));
    const shard = path.join(dir, 'shard-1.json');
    fs.writeFileSync(
      shard,
      JSON.stringify({
        testResults: [
          {
            name: '/home/runner/work/EquipQR/EquipQR/src/a.test.tsx',
            assertionResults: [
              { fullName: 'a slow', duration: 400, status: 'passed' },
              { fullName: 'a fast', duration: 50, status: 'passed' },
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

    const report = aggregateVitestDurations([shard]);
    expect(report.summary.tests).toBe(3);
    expect(report.summary.over200ms).toBe(2);
    expect(report.files[0].file).toBe('src/a.test.tsx');
    expect(report.files[0].ms).toBe(450);
    expect(report.tests[0].title).toBe('a slow');

    const text = formatDurationReport(report, { topFiles: 2, topTests: 2 });
    expect(text).toContain('src/a.test.tsx');
    expect(text).toContain('a slow');
  });
});
