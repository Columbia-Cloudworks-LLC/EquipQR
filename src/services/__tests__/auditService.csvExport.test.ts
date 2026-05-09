import { describe, it, expect } from 'vitest';
import {
  convertToCsvRows,
  generateCsvString,
} from '@/services/auditService';
import type { AuditLogEntry } from '@/types/audit';

/** Fixed UTC instant used for regression coverage (#772). */
const ZULU_INSTANT = '2024-06-15T14:30:45.123Z';

function makeEntry(created_at: string): AuditLogEntry {
  return {
    id: 'entry-1',
    organization_id: 'org-1',
    entity_type: 'equipment',
    entity_id: 'eq-1',
    entity_name: 'Forklift A',
    action: 'UPDATE',
    actor_id: 'user-1',
    actor_name: 'Pat Example',
    actor_email: 'pat@example.com',
    changes: { status: { old: 'active', new: 'inactive' } },
    metadata: {},
    created_at,
  };
}

describe('audit CSV export timestamps (#772)', () => {
  it('maps created_at to ISO-8601 Zulu independent of source offset notation', () => {
    const equivalentOffset = '2024-06-15T10:30:45.123-04:00';
    const rowsZ = convertToCsvRows([makeEntry(ZULU_INSTANT)]);
    const rowsOffset = convertToCsvRows([makeEntry(equivalentOffset)]);

    expect(rowsZ[0].date).toBe(ZULU_INSTANT);
    expect(rowsOffset[0].date).toBe(ZULU_INSTANT);
    expect(rowsZ[0].time).toBe('');
  });

  it('includes the Zulu timestamp in generated CSV (first column)', () => {
    const csv = generateCsvString(convertToCsvRows([makeEntry(ZULU_INSTANT)]));
    const lines = csv.split('\n');
    expect(lines[0]).toMatch(/^Timestamp \(UTC\),/);
    expect(lines[1]).toContain(ZULU_INSTANT);
  });
});
