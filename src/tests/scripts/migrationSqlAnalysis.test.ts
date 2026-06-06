import { describe, it, expect } from 'vitest';
import {
  escapeRegExp,
  stripSqlCommentsPreserveLength,
  normalizeTableIdentifier,
  parseAlterTableIdentifier,
  tableIdentifiersMatch,
  findLastAlterTableBefore,
  findStatementEndSemicolon,
  collectDropColumnMatches,
} from '../../../scripts/lib/migrationSqlAnalysis.mjs';

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('col.name+test')).toBe('col\\.name\\+test');
  });
});

describe('stripSqlCommentsPreserveLength', () => {
  it('blanks line comments while preserving newlines', () => {
    const input = "SELECT 1;\n-- DROP COLUMN secret\nSELECT 2;";
    const stripped = stripSqlCommentsPreserveLength(input);
    expect(stripped).toHaveLength(input.length);
    expect(stripped).not.toContain('DROP COLUMN');
    expect(stripped.split('\n').length).toBe(input.split('\n').length);
  });

  it('blanks block comments and dollar-quoted function bodies', () => {
    const input = `CREATE FUNCTION foo() RETURNS void AS $$
      ALTER TABLE widgets DROP COLUMN hidden;
    $$ LANGUAGE plpgsql;`;
    const stripped = stripSqlCommentsPreserveLength(input);
    expect(stripped).not.toMatch(/DROP\s+COLUMN/i);
  });
});

describe('normalizeTableIdentifier', () => {
  it('lowercases schema-qualified quoted identifiers', () => {
    expect(normalizeTableIdentifier('"Public"."Widgets"')).toBe('public.widgets');
  });
});

describe('parseAlterTableIdentifier', () => {
  it('parses IF EXISTS and schema-qualified table names', () => {
    const statement = 'ALTER TABLE IF EXISTS public."Widgets" ADD COLUMN x int;';
    expect(parseAlterTableIdentifier(statement)).toBe('public.widgets');
  });
});

describe('tableIdentifiersMatch', () => {
  it('matches bare table names across schemas', () => {
    expect(tableIdentifiersMatch('public.widgets', 'widgets')).toBe(true);
    expect(tableIdentifiersMatch('public.widgets', 'public.parts')).toBe(false);
  });
});

describe('findLastAlterTableBefore', () => {
  it('skips ALTER TABLE tokens inside line comments', () => {
    const sql = '-- ALTER TABLE decoy\nALTER TABLE real_table DROP COLUMN x;';
    const idx = sql.indexOf('DROP COLUMN');
    expect(findLastAlterTableBefore(sql, idx)).toBe(sql.indexOf('ALTER TABLE real_table'));
  });
});

describe('findStatementEndSemicolon', () => {
  it('finds terminator after quoted semicolons', () => {
    const sql = "ALTER TABLE t SET note = 'a;b'; DROP COLUMN x;";
    const alterStart = sql.indexOf('ALTER TABLE');
    const semi = findStatementEndSemicolon(sql, alterStart);
    expect(sql.slice(alterStart, semi + 1)).toBe("ALTER TABLE t SET note = 'a;b';");
  });
});

describe('collectDropColumnMatches', () => {
  it('collects lead and chained DROP COLUMN occurrences in order', () => {
    const sql = stripSqlCommentsPreserveLength(
      'ALTER TABLE widgets DROP COLUMN alpha, DROP COLUMN IF EXISTS beta;',
    );
    const matches = collectDropColumnMatches(sql);
    expect(matches).toHaveLength(2);
    expect(matches[0].groups[1] || matches[0].groups[2] || matches[0].groups[3] || matches[0].groups[4]).toBe(
      'alpha',
    );
    expect(matches[1].groups[1] || matches[1].groups[2] || matches[1].groups[3] || matches[1].groups[4]).toBe(
      'beta',
    );
  });
});
