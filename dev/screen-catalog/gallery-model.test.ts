import { describe, expect, it } from 'vitest';
import type { CapturedScreen, CatalogFlow } from '../../e2e/screen-catalog/types';
import { buildGalleryModel, indexMarkdown, screenContextMarkdown } from './gallery-model';

const flow: CatalogFlow = {
  id: 'work-orders',
  title: 'Work orders',
  area: 'Maintenance',
  description: 'Work order flow',
  personas: ['owner', 'technician'],
  screens: [
    { id: 'list', title: 'List', description: 'List view', route: '/dashboard/work-orders', sources: ['a.tsx'] },
    {
      id: 'add-cost',
      title: 'Add cost',
      description: 'Cost dialog',
      route: '/dashboard/work-orders/1',
      sources: ['b.tsx'],
      personas: ['owner'],
    },
  ],
};

function capture(overrides: Partial<CapturedScreen> = {}): CapturedScreen {
  return {
    flowId: 'work-orders',
    flowTitle: 'Work orders',
    area: 'Maintenance',
    screenId: 'list',
    screenTitle: 'List',
    description: 'List view',
    persona: 'owner',
    personaLabel: 'Alex Apex (Owner)',
    device: 'Pixel 7',
    viewport: { width: 412, height: 839, deviceScaleFactor: 2 },
    clock: '2026-05-15T15:00:00.000Z',
    route: '/dashboard/work-orders',
    finalUrl: '/dashboard/work-orders',
    pageTitle: 'EquipQR',
    howToReach: ['Signed in as Alex Apex (Owner)', 'Open /dashboard/work-orders'],
    sources: ['a.tsx'],
    status: 'ok',
    warnings: [],
    notes: [],
    captureMode: 'page',
    scroll: { container: 'document', scrollHeight: 1600, clientHeight: 839, topInset: 0, bottomInset: 66, truncated: false },
    dir: 'screens/work-orders/owner/01-list',
    slices: [
      { file: 'screens/work-orders/owner/01-list/slice-01.png', index: 1, scrollTop: 0 },
      { file: 'screens/work-orders/owner/01-list/slice-02.png', index: 2, scrollTop: 761 },
    ],
    headings: ['h1 Work Orders'],
    visibleText: 'Work Orders\nOil change',
    ariaSnapshot: '- heading "Work Orders" [level=1]',
    consoleErrors: [],
    failedRequests: [],
    capturedAt: '2026-11-06T12:00:00.000Z',
    orderIndex: 1,
    ...overrides,
  };
}

describe('buildGalleryModel', () => {
  it('keeps manifest order, honours per-screen personas and marks missing captures', () => {
    const model = buildGalleryModel([flow], [capture()]);
    const [owner, technician] = model[0].lanes;

    expect(owner.personaLabel).toBe('Alex Apex (Owner)');
    expect(owner.frames.map((frame) => [frame.screenId, frame.order, frame.capture !== null])).toEqual([
      ['list', 1, true],
      ['add-cost', 2, false],
    ]);
    expect(technician.personaLabel).toBe('Technician');
    expect(technician.frames.map((frame) => frame.screenId)).toEqual(['list']);
    expect(technician.frames[0].capture).toBeNull();
  });
});

describe('screenContextMarkdown', () => {
  it('lists absolute slice paths, steps and sources', () => {
    const markdown = screenContextMarkdown(capture(), { absoluteRoot: '/repo/tmp/screen-catalog/pixel-7' });

    expect(markdown).toContain('## Work orders › List');
    expect(markdown).toContain('1. Signed in as Alex Apex (Owner)');
    expect(markdown).toContain('- `a.tsx`');
    expect(markdown).toContain(
      '- Slice 2 (scrollTop 761px): `/repo/tmp/screen-catalog/pixel-7/screens/work-orders/owner/01-list/slice-02.png`',
    );
    expect(markdown).toContain('**Accessibility tree**');
  });

  it('omits the long text sections in brief mode and reports failures', () => {
    const markdown = screenContextMarkdown(capture({ status: 'error', error: 'Timeout waiting\nstack' }), {
      absoluteRoot: '/r',
      includeText: false,
    });

    expect(markdown).toContain('- **Capture failed:** Timeout waiting');
    expect(markdown).not.toContain('**Rendered text**');
    expect(markdown).not.toContain('**Accessibility tree**');
  });

  it('uses a longer fence when captured text contains backticks', () => {
    const markdown = screenContextMarkdown(capture({ visibleText: 'code ```js``` here' }), { absoluteRoot: '/r' });

    expect(markdown).toContain('````text\ncode ```js``` here\n````');
  });
});

describe('indexMarkdown', () => {
  it('links each captured screen to its context file', () => {
    const model = buildGalleryModel([flow], [capture()]);
    const markdown = indexMarkdown(model, { device: 'Pixel 7', clock: 'c', builtAt: 'b' });

    expect(markdown).toContain('- 01 [List](screens/work-orders/owner/01-list/context.md)');
    expect(markdown).toContain('- 02 Add cost — _not captured_');
  });
});
