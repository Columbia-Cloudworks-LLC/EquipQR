import { describe, it, expect } from 'vitest';
import { FormattedAuditEntry } from '@/types/audit';
import {
  formatAuditEntryMarkdown,
  formatAuditEntriesMarkdown,
} from './auditEntryMarkdown';

function makeEntry(overrides: Partial<FormattedAuditEntry> = {}): FormattedAuditEntry {
  return {
    id: 'entry-1',
    organization_id: 'org-1',
    entity_type: 'inventory_item',
    entity_id: 'item-1',
    entity_name: 'Hydraulic Oil',
    action: 'UPDATE',
    actor_id: 'actor-1',
    actor_name: 'Alex Apex',
    actor_email: 'alex@apex.test',
    changes: {
      default_unit_cost: { old: 89.99, new: 42.5 },
      low_stock_threshold: { old: 10, new: 7 },
    },
    metadata: { source: 'inline_edit' },
    created_at: '2026-07-07T21:58:00.000Z',
    actionLabel: 'Updated',
    entityTypeLabel: 'Inventory Item',
    formattedDate: 'Jul 7, 2026',
    relativeTime: '2 minutes ago',
    changeCount: 2,
    ...overrides,
  };
}

describe('formatAuditEntryMarkdown', () => {
  it('renders a heading, key facts, and a changes table', () => {
    const markdown = formatAuditEntryMarkdown(makeEntry());

    expect(markdown).toContain('### Inventory Item: Hydraulic Oil — Updated');
    expect(markdown).toContain('- **Changed by:** Alex Apex (alex@apex.test)');
    expect(markdown).toContain('- **Entry ID:** `entry-1`');
    expect(markdown).toContain('| Field | Old | New |');
    expect(markdown).toContain('| default_unit_cost | 89.99 | 42.5 |');
    expect(markdown).toContain('| low_stock_threshold | 10 | 7 |');
    expect(markdown).toContain('- source: inline_edit');
  });

  it('escapes pipes and newlines in change values', () => {
    const markdown = formatAuditEntryMarkdown(
      makeEntry({
        changes: { notes: { old: 'a|b', new: 'line1\nline2' } },
      }),
    );

    expect(markdown).toContain('| notes | a\\|b | line1 line2 |');
  });

  it('notes when no field changes were recorded', () => {
    const markdown = formatAuditEntryMarkdown(makeEntry({ changes: {}, metadata: {} }));
    expect(markdown).toContain('_No field changes recorded._');
  });
});

describe('formatAuditEntriesMarkdown', () => {
  it('joins entries with separators under an export header', () => {
    const markdown = formatAuditEntriesMarkdown([
      makeEntry({ id: 'e1' }),
      makeEntry({ id: 'e2', entity_name: 'Air Filter' }),
    ]);

    expect(markdown).toContain('# Audit Log Export');
    expect(markdown).toContain('_2 entries — generated');
    expect(markdown).toContain('`e1`');
    expect(markdown).toContain('Air Filter');
    expect(markdown.split('\n---\n')).toHaveLength(2);
  });
});
