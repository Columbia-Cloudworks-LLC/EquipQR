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
  parseRpcGrantMarkerNames,
  parseGrantedFunctionName,
  collectRpcGrantSecurityErrors,
  hasBulkLockdownGrantMarker,
} from './migrationSqlAnalysis.mjs';

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

describe('collectRpcGrantSecurityErrors', () => {
  const anonAllowlist = ['get_invitation_by_token_secure'];
  const authenticatedAllowlist = ['refresh_quickbooks_tokens_manual'];

  it('rejects anon grants when marker name is not allowlisted', () => {
    const content = `-- rpc-anon-grant-allowed: fake_rpc\nGRANT EXECUTE ON FUNCTION public.fake_rpc(text) TO anon;`;
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260607120000_fake.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors.some((error) => error.includes('fake_rpc'))).toBe(true);
  });

  it('accepts allowlisted anon marker matching the granted function', () => {
    const content =
      '-- rpc-anon-grant-allowed: get_invitation_by_token_secure\n' +
      'GRANT EXECUTE ON FUNCTION public.get_invitation_by_token_secure(text) TO anon;';
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260607120000_ok.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts authenticated grants with bulk-lockdown marker', () => {
    const content =
      '-- rpc-authenticated-grant-allowed: bulk-lockdown\n' +
      'GRANT EXECUTE ON FUNCTION public.get_dashboard_trends() TO authenticated;';
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260602120000_lockdown.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors).toHaveLength(0);
  });

  it('requires authenticated marker names to match granted functions', () => {
    const content =
      '-- rpc-authenticated-grant-allowed: refresh_quickbooks_tokens_manual\n' +
      'GRANT EXECUTE ON FUNCTION public.refresh_quickbooks_tokens_manual() TO authenticated;';
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260602130000_harden.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects quoted schema-qualified anon grants without matching markers', () => {
    const content =
      '-- rpc-anon-grant-allowed: get_invitation_by_token_secure\n' +
      'GRANT EXECUTE ON FUNCTION "public"."other_fn"() TO anon;';
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260607130000_quoted.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors.some((error) => error.includes('other_fn'))).toBe(true);
  });

  it('rejects private-schema authenticated grants without matching markers', () => {
    const content =
      '-- rpc-authenticated-grant-allowed: refresh_quickbooks_tokens_manual\n' +
      'GRANT EXECUTE ON FUNCTION private.my_fn() TO authenticated;';
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260607130000_private.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors.some((error) => error.includes('my_fn'))).toBe(true);
  });

  it('fails closed when the granted function identifier cannot be parsed', () => {
    const content =
      '-- rpc-anon-grant-allowed: get_invitation_by_token_secure\n' +
      'GRANT EXECUTE ON FUNCTION 123invalid() TO anon;';
    const errors = collectRpcGrantSecurityErrors({
      fileName: '20260607130000_unparsed.sql',
      content,
      analysisContent: content,
      rpcAnonAllowlist: anonAllowlist,
      rpcAuthenticatedAllowlist: authenticatedAllowlist,
    });

    expect(errors.some((error) => error.includes('could not be parsed'))).toBe(true);
  });
});

describe('parseRpcGrantMarkerNames', () => {
  it('parses marker function names from comments', () => {
    const content =
      '-- rpc-anon-grant-allowed: get_invitation_by_token_secure (bulk lockdown)\n' +
      '-- rpc-authenticated-grant-allowed: bulk-lockdown';
    expect(parseRpcGrantMarkerNames(content, 'anon')).toEqual(['get_invitation_by_token_secure']);
    expect(parseRpcGrantMarkerNames(content, 'authenticated')).toEqual(['bulk-lockdown']);
  });
});

describe('parseGrantedFunctionName', () => {
  it('extracts function names from GRANT statements', () => {
    expect(
      parseGrantedFunctionName(
        'GRANT EXECUTE ON FUNCTION public.refresh_quickbooks_tokens_manual() TO authenticated;',
      ),
    ).toBe('refresh_quickbooks_tokens_manual');
  });

  it('extracts function names from quoted schema-qualified GRANT statements', () => {
    expect(
      parseGrantedFunctionName('GRANT EXECUTE ON FUNCTION "public"."my_fn"() TO anon;'),
    ).toBe('my_fn');
  });

  it('extracts function names from non-public schema GRANT statements', () => {
    expect(
      parseGrantedFunctionName('GRANT EXECUTE ON FUNCTION private.my_fn() TO authenticated;'),
    ).toBe('my_fn');
  });
});

describe('hasBulkLockdownGrantMarker', () => {
  it('detects bulk lockdown markers', () => {
    expect(hasBulkLockdownGrantMarker('-- rpc-authenticated-grant-allowed: bulk-lockdown')).toBe(true);
    expect(hasBulkLockdownGrantMarker('-- rpc-anon-grant-allowed: get_invitation_by_token_secure (bulk lockdown)')).toBe(
      true,
    );
  });
});
