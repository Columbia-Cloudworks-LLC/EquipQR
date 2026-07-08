/**
 * Markdown serialization for audit log entries (#1166). Used by the single-
 * entry "Copy as Markdown" action and the multi-select Markdown export.
 */

import { FormattedAuditEntry } from '@/types/audit';
import { formatIsoZulu } from '@/utils/dateFormatter';

function escapeTableCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** One entry as a self-contained markdown section. */
export function formatAuditEntryMarkdown(entry: FormattedAuditEntry): string {
  const lines: string[] = [];
  lines.push(`### ${entry.entityTypeLabel}: ${entry.entity_name ?? 'Unknown'} — ${entry.actionLabel}`);
  lines.push('');
  lines.push(`- **Date:** ${formatIsoZulu(entry.created_at)}`);
  lines.push(`- **Action:** ${entry.actionLabel}`);
  lines.push(`- **Entity type:** ${entry.entityTypeLabel}`);
  lines.push(
    `- **Changed by:** ${entry.actor_name}${entry.actor_email ? ` (${entry.actor_email})` : ''}`,
  );
  lines.push(`- **Entry ID:** \`${entry.id}\``);
  lines.push(`- **Entity ID:** \`${entry.entity_id}\``);

  const changeKeys = Object.keys(entry.changes);
  if (changeKeys.length > 0) {
    lines.push('');
    lines.push('| Field | Old | New |');
    lines.push('| --- | --- | --- |');
    for (const key of changeKeys) {
      const change = entry.changes[key];
      lines.push(
        `| ${escapeTableCell(key)} | ${escapeTableCell(change.old)} | ${escapeTableCell(change.new)} |`,
      );
    }
  } else {
    lines.push('');
    lines.push('_No field changes recorded._');
  }

  const metadataKeys = Object.keys(entry.metadata ?? {});
  if (metadataKeys.length > 0) {
    lines.push('');
    lines.push('**Metadata**');
    lines.push('');
    for (const key of metadataKeys) {
      lines.push(`- ${key.replace(/_/g, ' ')}: ${escapeTableCell(entry.metadata[key])}`);
    }
  }

  return lines.join('\n');
}

/** Multiple entries as one export document. */
export function formatAuditEntriesMarkdown(entries: FormattedAuditEntry[]): string {
  const header = [
    '# Audit Log Export',
    '',
    `_${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} — generated ${formatIsoZulu(new Date().toISOString())}_`,
    '',
  ].join('\n');

  return `${header}\n${entries.map(formatAuditEntryMarkdown).join('\n\n---\n\n')}\n`;
}
