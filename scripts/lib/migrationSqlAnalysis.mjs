/**
 * Pure SQL analysis helpers for Supabase migration validation.
 * Used by .github/scripts/validate-migrations.js and unit tests.
 */

export const dropColumnLeadRegex =
  /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(?:"[^"]+"|[a-zA-Z_]\w*)\s*\.\s*)?(?:"[^"]+"|[a-zA-Z_]\w*)\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+(?:"([^"]+)"|(\w+))|(?:"([^"]+)"|(\w+)))/gi;

export const dropColumnChainRegex =
  /,\s*DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+(?:"([^"]+)"|(\w+))|(?:"([^"]+)"|(\w+)))/gi;

export const createTableRegex =
  /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s*\.\s*)?(?:"([^"]+)"|([a-z_][a-z0-9_]*))/gi;

/**
 * @param {string} str
 */
export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace SQL comments with whitespace (preserving newlines and string literals)
 * so downstream regex scans keep stable indices without counting commented SQL.
 *
 * @param {string} content
 */
export function stripSqlCommentsPreserveLength(content) {
  let result = '';
  let i = 0;
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += '\n';
      } else {
        result += ' ';
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        result += '  ';
        i += 2;
        inBlockComment = false;
      } else {
        result += char === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    if (inSingleQuote) {
      result += char;
      if (char === "'" && nextChar === "'") {
        result += nextChar;
        i += 2;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      i++;
      continue;
    }

    if (char === '$') {
      let j = i + 1;
      while (j < content.length && /[A-Za-z0-9_]/.test(content[j])) {
        j++;
      }
      if (j < content.length && content[j] === '$') {
        const dollarTag = content.slice(i, j + 1);
        const closeIdx = content.indexOf(dollarTag, j + 1);
        if (closeIdx !== -1) {
          const endIdx = closeIdx + dollarTag.length;
          for (let k = i; k < endIdx; k++) {
            result += content[k] === '\n' ? '\n' : ' ';
          }
          i = endIdx;
          continue;
        }
      }
    }

    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      result += '  ';
      i += 2;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      result += '  ';
      i += 2;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * @param {string} content
 * @param {number} index
 */
export function isLineSqlComment(content, index) {
  const lineStart = content.lastIndexOf('\n', index - 1) + 1;
  return content.slice(lineStart, index).trimStart().startsWith('--');
}

/**
 * @param {string} content
 * @param {number} beforeIndex
 */
export function findLastAlterTableBefore(content, beforeIndex) {
  const lower = content.toLowerCase();
  const needle = 'alter table';
  let last = -1;
  let pos = 0;
  while (pos < beforeIndex) {
    const idx = lower.indexOf(needle, pos);
    if (idx === -1 || idx >= beforeIndex) break;
    if (!isLineSqlComment(content, idx)) {
      last = idx;
    }
    pos = idx + 1;
  }
  return last;
}

/**
 * @param {string} content
 * @param {number} start
 */
export function findStatementEndSemicolon(content, start) {
  let i = start;
  let inSingle = false;
  while (i < content.length) {
    if (!inSingle && content.startsWith('--', i)) {
      const nl = content.indexOf('\n', i);
      i = nl === -1 ? content.length : nl + 1;
      continue;
    }
    const c = content[i];
    if (c === "'") {
      if (inSingle && content[i + 1] === "'") {
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      i++;
      continue;
    }
    if (!inSingle && c === ';') return i;
    i++;
  }
  return content.length - 1;
}

/**
 * @param {string | null | undefined} identifier
 */
export function normalizeTableIdentifier(identifier) {
  if (!identifier) return null;
  const parts = identifier
    .split('.')
    .map((part) => part.trim().replace(/^"|"$/g, '').toLowerCase())
    .filter(Boolean);
  return parts.length > 0 ? parts.join('.') : null;
}

/**
 * @param {string} statement
 */
export function parseAlterTableIdentifier(statement) {
  const match = statement.match(
    /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?((?:(?:"[^"]+"|[a-zA-Z_]\w*)\s*\.\s*)?(?:"[^"]+"|[a-zA-Z_]\w*))/i,
  );
  return normalizeTableIdentifier(match?.[1] ?? null);
}

/**
 * @param {string | null} left
 * @param {string | null} right
 */
export function tableIdentifiersMatch(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;

  const leftTable = left.split('.').at(-1);
  const rightTable = right.split('.').at(-1);
  return Boolean(leftTable && rightTable && leftTable === rightTable);
}

/**
 * @param {string} content
 */
export function collectDropColumnMatches(content) {
  const matches = [];

  dropColumnLeadRegex.lastIndex = 0;
  let m;
  while ((m = dropColumnLeadRegex.exec(content)) !== null) {
    matches.push({ index: m.index, groups: m });
  }

  dropColumnChainRegex.lastIndex = 0;
  while ((m = dropColumnChainRegex.exec(content)) !== null) {
    matches.push({ index: m.index, groups: m });
  }

  matches.sort((a, b) => a.index - b.index);
  return matches;
}

/** Grants EXECUTE/ALL on functions to anon widen the PostgREST attack surface. */
export const grantFunctionToAnonRegex =
  /GRANT\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+[^;]+\s+TO\s+[^;]*\banon\b/gi;

/** Grants EXECUTE/ALL on SECURITY DEFINER functions to authenticated widen REST RPC surface. */
export const grantFunctionToAuthenticatedRegex =
  /GRANT\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+[^;]+\s+TO\s+[^;]*\bauthenticated\b/gi;

const rpcAnonGrantMarkerRegex = /--\s*rpc-anon-grant-allowed:\s*([a-z_][a-z0-9_]*)/gi;
const rpcAuthenticatedGrantMarkerRegex =
  /--\s*rpc-authenticated-grant-allowed:\s*([a-z_][a-z0-9_-]*)/gi;

/**
 * @param {string} content
 * @param {'anon' | 'authenticated'} role
 */
export function parseRpcGrantMarkerNames(content, role) {
  const regex =
    role === 'anon' ? rpcAnonGrantMarkerRegex : rpcAuthenticatedGrantMarkerRegex;
  /** @type {string[]} */
  const names = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(content)) !== null) {
    names.push(match[1].toLowerCase());
  }
  return names;
}

/**
 * @param {string} grantStatement
 */
export function parseGrantedFunctionName(grantStatement) {
  const match =
    /GRANT\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+(?:(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s*\.\s*)?(?:"([^"]+)"|([a-z_][a-z0-9_]*))/i.exec(
      grantStatement,
    );
  if (!match) return null;
  return (match[3] || match[4]).toLowerCase();
}

/**
 * @param {string[]} errors
 * @param {string} fileName
 * @param {{ statement: string }} grant
 * @param {'anon' | 'authenticated'} role
 */
function pushUnparsedGrantFunctionError(errors, fileName, grant, role) {
  errors.push(
    `[RPC SECURITY] "${fileName}" grants EXECUTE on a function to role ${role} but the function identifier could not be parsed from the GRANT statement.\n` +
      `  Use an unquoted schema-qualified form (e.g. public.fn_name) or update the migration validator parser.\n` +
      `  Statement: ${grant.statement.trim()}`,
  );
}

/**
 * @param {string} analysisContent
 * @param {'anon' | 'authenticated'} role
 */
export function collectFunctionGrantsToRole(analysisContent, role) {
  const regex = role === 'anon' ? grantFunctionToAnonRegex : grantFunctionToAuthenticatedRegex;
  /** @type {{ statement: string; functionName: string | null; index: number }[]} */
  const grants = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(analysisContent)) !== null) {
    grants.push({
      statement: match[0],
      functionName: parseGrantedFunctionName(match[0]),
      index: match.index,
    });
  }
  return grants;
}

/**
 * @param {string} content
 */
export function hasBulkLockdownGrantMarker(content) {
  return (
    /--\s*rpc-authenticated-grant-allowed:\s*bulk-lockdown/i.test(content) ||
    /--\s*rpc-anon-grant-allowed:.*bulk lockdown/i.test(content)
  );
}

/**
 * @param {{
 *   fileName: string;
 *   content: string;
 *   analysisContent: string;
 *   rpcAnonAllowlist: string[];
 *   rpcAuthenticatedAllowlist: string[];
 * }} options
 */
export function collectRpcGrantSecurityErrors({
  fileName,
  content,
  analysisContent,
  rpcAnonAllowlist,
  rpcAuthenticatedAllowlist,
}) {
  /** @type {string[]} */
  const errors = [];
  const anonAllowSet = new Set(rpcAnonAllowlist.map((name) => name.toLowerCase()));
  const authenticatedAllowSet = new Set(
    rpcAuthenticatedAllowlist.map((name) => name.toLowerCase()),
  );

  const anonGrants = collectFunctionGrantsToRole(analysisContent, 'anon');
  const anonMarkers = parseRpcGrantMarkerNames(content, 'anon');

  if (anonGrants.length > 0) {
    if (anonMarkers.length === 0) {
      errors.push(
        `[RPC SECURITY] "${fileName}" grants EXECUTE on a function to role anon.\n` +
          `  Add a reviewed allowlist entry to scripts/security-definer-rpc-allowlists.json and include\n` +
          `  "-- rpc-anon-grant-allowed: <function_name>" in this migration, or revoke anon instead.\n` +
          `  Allowed anon RPC names: ${rpcAnonAllowlist.join(', ')}`,
      );
    } else {
      for (const markerName of anonMarkers) {
        if (!anonAllowSet.has(markerName)) {
          errors.push(
            `[RPC SECURITY] "${fileName}" marker rpc-anon-grant-allowed references "${markerName}" which is not in scripts/security-definer-rpc-allowlists.json.\n` +
              `  Allowed anon RPC names: ${rpcAnonAllowlist.join(', ')}`,
          );
        }
      }

      for (const grant of anonGrants) {
        if (!grant.functionName) {
          pushUnparsedGrantFunctionError(errors, fileName, grant, 'anon');
          continue;
        }
        if (!anonMarkers.includes(grant.functionName)) {
          errors.push(
            `[RPC SECURITY] "${fileName}" grants EXECUTE on function "${grant.functionName}" to anon but has no matching rpc-anon-grant-allowed marker.`,
          );
        }
      }
    }
  }

  const authenticatedGrants = collectFunctionGrantsToRole(analysisContent, 'authenticated');
  const authenticatedMarkers = parseRpcGrantMarkerNames(content, 'authenticated');
  const bulkLockdown = hasBulkLockdownGrantMarker(content);

  if (authenticatedGrants.length > 0) {
    if (authenticatedMarkers.length === 0 && !bulkLockdown) {
      errors.push(
        `[RPC SECURITY] "${fileName}" grants EXECUTE on a function to role authenticated.\n` +
          `  Add the function to scripts/security-definer-rpc-allowlists.json and include\n` +
          `  "-- rpc-authenticated-grant-allowed: <function_name>" in this migration, or rely on\n` +
          `  the bulk lockdown migration instead of per-function GRANTs.\n` +
          `  Reviewed authenticated/RLS helper names: ${[...new Set(rpcAuthenticatedAllowlist)].slice(0, 8).join(', ')}${rpcAuthenticatedAllowlist.length > 8 ? ', ...' : ''}`,
      );
    } else if (!bulkLockdown) {
      for (const markerName of authenticatedMarkers) {
        if (markerName === 'bulk-lockdown') continue;
        if (!authenticatedAllowSet.has(markerName)) {
          errors.push(
            `[RPC SECURITY] "${fileName}" marker rpc-authenticated-grant-allowed references "${markerName}" which is not in scripts/security-definer-rpc-allowlists.json.`,
          );
        }
      }

      for (const grant of authenticatedGrants) {
        if (!grant.functionName) {
          pushUnparsedGrantFunctionError(errors, fileName, grant, 'authenticated');
          continue;
        }
        if (!authenticatedMarkers.includes(grant.functionName)) {
          errors.push(
            `[RPC SECURITY] "${fileName}" grants EXECUTE on function "${grant.functionName}" to authenticated but has no matching rpc-authenticated-grant-allowed marker.`,
          );
        }
      }
    }
  }

  return errors;
}
