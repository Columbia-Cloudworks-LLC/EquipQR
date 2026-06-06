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
