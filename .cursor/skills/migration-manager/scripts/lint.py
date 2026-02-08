#!/usr/bin/env python3
"""
lint.py — Lint a Supabase migration SQL file for forbidden patterns.

Usage:
    python .cursor/skills/migration-manager/scripts/lint.py <path_to_migration.sql>

Exit codes:
    0 = clean
    1 = warnings found

Checks:
    1. CREATE TABLE without ENABLE ROW LEVEL SECURITY
    2. CREATE TABLE without any accompanying RLS policy
    3. Bare DROP TABLE / DROP COLUMN without -- DESTRUCTIVE: comment
    4. Missing IF NOT EXISTS on CREATE TABLE
    5. Missing CREATE OR REPLACE on functions
    6. Hardcoded UUIDs in INSERT statements
    7. SECURITY DEFINER without SET search_path
"""

import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

# Matches CREATE TABLE statements, capturing the table name
RE_CREATE_TABLE = re.compile(
    r"^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"
    r"\"?(\w+)\"?",
    re.IGNORECASE | re.MULTILINE,
)

RE_CREATE_TABLE_NO_IF = re.compile(
    r"^\s*CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)",
    re.IGNORECASE | re.MULTILINE,
)

RE_ENABLE_RLS = re.compile(
    r"ALTER\s+TABLE\s+(?:public\.)?\"?(\w+)\"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY",
    re.IGNORECASE,
)

RE_RLS_POLICY = re.compile(
    r"CREATE\s+POLICY\s+.*?\s+ON\s+(?:public\.)?\"?(\w+)\"?",
    re.IGNORECASE,
)

RE_DROP_TABLE = re.compile(
    r"^\s*DROP\s+TABLE",
    re.IGNORECASE | re.MULTILINE,
)

RE_DROP_COLUMN = re.compile(
    r"^\s*ALTER\s+TABLE\s+.*?\s+DROP\s+COLUMN",
    re.IGNORECASE | re.MULTILINE,
)

RE_DESTRUCTIVE_COMMENT = re.compile(
    r"--\s*DESTRUCTIVE:",
    re.IGNORECASE,
)

RE_CREATE_FUNCTION_NO_REPLACE = re.compile(
    r"^\s*CREATE\s+FUNCTION\s+",
    re.IGNORECASE | re.MULTILINE,
)

RE_CREATE_OR_REPLACE_FUNCTION = re.compile(
    r"^\s*CREATE\s+OR\s+REPLACE\s+FUNCTION\s+",
    re.IGNORECASE | re.MULTILINE,
)

# UUID pattern: 8-4-4-4-12 hex
RE_HARDCODED_UUID = re.compile(
    r"'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'",
    re.IGNORECASE,
)

RE_INSERT = re.compile(
    r"^\s*INSERT\s+INTO",
    re.IGNORECASE | re.MULTILINE,
)

RE_SECURITY_DEFINER = re.compile(
    r"\bSECURITY\s+DEFINER\b",
    re.IGNORECASE,
)

RE_SET_SEARCH_PATH = re.compile(
    r"\bSET\s+search_path\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_line_number(content: str, match_start: int) -> int:
    """Return 1-based line number for a character offset."""
    return content[:match_start].count("\n") + 1


def is_stub_migration(content: str) -> bool:
    """Check if this is a stub/consolidated migration with no real SQL."""
    lines = [l.strip() for l in content.splitlines() if l.strip()]
    # A stub has only comments (or is empty)
    return all(l.startswith("--") for l in lines)


# ---------------------------------------------------------------------------
# Lint checks
# ---------------------------------------------------------------------------

def lint_file(filepath: Path) -> list[str]:
    """Run all lint checks on a migration file. Returns list of warning strings."""
    content = filepath.read_text(encoding="utf-8")
    warnings: list[str] = []

    # Skip stub migrations
    if is_stub_migration(content):
        return warnings

    lines = content.splitlines()

    # --- 1 & 2: CREATE TABLE without RLS --------------------------------
    created_tables = set()
    for m in RE_CREATE_TABLE.finditer(content):
        table = m.group(1).lower()
        created_tables.add(table)

    rls_enabled_tables = {m.group(1).lower() for m in RE_ENABLE_RLS.finditer(content)}
    rls_policy_tables = {m.group(1).lower() for m in RE_RLS_POLICY.finditer(content)}

    for table in created_tables:
        if table not in rls_enabled_tables:
            warnings.append(
                f"CREATE TABLE '{table}' without ENABLE ROW LEVEL SECURITY"
            )
        if table not in rls_policy_tables:
            warnings.append(
                f"CREATE TABLE '{table}' without any RLS policy"
            )

    # --- 3: Bare DROP TABLE / DROP COLUMN without DESTRUCTIVE comment ----
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if RE_DROP_TABLE.match(stripped) or RE_DROP_COLUMN.match(stripped):
            # Check preceding 3 lines for -- DESTRUCTIVE: comment
            preceding = "\n".join(lines[max(0, i - 4) : i - 1])
            if not RE_DESTRUCTIVE_COMMENT.search(preceding) and not RE_DESTRUCTIVE_COMMENT.search(stripped):
                warnings.append(
                    f"Line {i}: {stripped[:60]}... — missing '-- DESTRUCTIVE:' comment"
                )

    # --- 4: CREATE TABLE without IF NOT EXISTS ---------------------------
    for m in RE_CREATE_TABLE_NO_IF.finditer(content):
        line_no = find_line_number(content, m.start())
        snippet = m.group(0).strip()[:60]
        warnings.append(
            f"Line {line_no}: {snippet} — missing IF NOT EXISTS"
        )

    # --- 5: CREATE FUNCTION without OR REPLACE --------------------------
    # Find all CREATE FUNCTION that are NOT CREATE OR REPLACE FUNCTION
    for m in RE_CREATE_FUNCTION_NO_REPLACE.finditer(content):
        # Verify this isn't actually a CREATE OR REPLACE
        region_start = max(0, m.start() - 5)
        region = content[region_start : m.end() + 20]
        if not RE_CREATE_OR_REPLACE_FUNCTION.search(region):
            line_no = find_line_number(content, m.start())
            warnings.append(
                f"Line {line_no}: CREATE FUNCTION without OR REPLACE"
            )

    # --- 6: Hardcoded UUIDs in INSERT statements -------------------------
    in_insert_block = False
    paren_depth = 0
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if RE_INSERT.match(stripped):
            in_insert_block = True
            paren_depth = 0

        if in_insert_block:
            paren_depth += stripped.count("(") - stripped.count(")")
            for uuid_match in RE_HARDCODED_UUID.finditer(line):
                warnings.append(
                    f"Line {i}: Hardcoded UUID {uuid_match.group(0)} in INSERT"
                )
            # End of INSERT when we see a semicolon at top-level
            if ";" in stripped and paren_depth <= 0:
                in_insert_block = False

    # --- 7: SECURITY DEFINER without SET search_path --------------------
    # Find function bodies that use SECURITY DEFINER
    # We look for SECURITY DEFINER and check if SET search_path appears
    # in the same function definition (rough heuristic: within 20 lines)
    for m in RE_SECURITY_DEFINER.finditer(content):
        line_no = find_line_number(content, m.start())
        # Check surrounding 30 lines for SET search_path
        start_line = max(0, line_no - 5)
        end_line = min(len(lines), line_no + 25)
        surrounding = "\n".join(lines[start_line:end_line])
        if not RE_SET_SEARCH_PATH.search(surrounding):
            warnings.append(
                f"Line {line_no}: SECURITY DEFINER function without SET search_path"
            )

    return warnings


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python lint.py <path_to_migration.sql>")
        print("       python lint.py supabase/migrations/*.sql  (lint all)")
        return 1

    all_clean = True

    for arg in sys.argv[1:]:
        filepath = Path(arg)
        if not filepath.exists():
            print(f"Error: File not found: {filepath}")
            all_clean = False
            continue

        if not filepath.suffix == ".sql":
            continue

        warnings = lint_file(filepath)

        if warnings:
            all_clean = False
            print(f"\n{'='*60}")
            print(f"  {filepath.name}")
            print(f"{'='*60}")
            for w in warnings:
                print(f"  ⚠  {w}")

    if all_clean:
        print("✅ All files clean — no lint warnings.")
        return 0
    else:
        print(f"\n❌ Lint warnings found. Fix before applying.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
