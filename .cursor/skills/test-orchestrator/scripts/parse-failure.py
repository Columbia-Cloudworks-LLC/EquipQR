#!/usr/bin/env python3
"""
parse-failure.py

Parses Vitest terminal output and extracts test failures into a concise
JSON report that an AI agent can consume to self-correct code.

Usage:
    python parse-failure.py <test-output-file>
    python parse-failure.py                     # reads from stdin
    type test-output.txt | python parse-failure.py

Output (stdout):
    A JSON array of failure objects:
    [
      {
        "file": "src/hooks/__tests__/useAuth.test.ts",
        "test": "useAuth > should return user when authenticated",
        "error": "expected 'admin' but received undefined",
        "expected": "admin",
        "actual": "undefined",
        "source_line": "expect(result.current.role).toBe('admin')",
        "stack_file": "src/hooks/__tests__/useAuth.test.ts",
        "stack_line": 42
      }
    ]

Exit codes:
    0 = parsed successfully (even if zero failures)
    1 = input error
"""

import json
import re
import sys
from typing import TextIO


def parse_vitest_output(stream: TextIO) -> list[dict]:
    """Parse Vitest output and return structured failure records."""
    content = stream.read()
    failures: list[dict] = []

    # ── Strategy 1: Parse FAIL blocks ──────────────────────────────
    # Vitest prints failures in blocks like:
    #
    #  FAIL  src/hooks/__tests__/useAuth.test.ts > useAuth > should return user
    #    AssertionError: expected 'admin' but received undefined
    #
    #    - Expected: "admin"
    #    + Received: "undefined"
    #
    #     ❯ src/hooks/__tests__/useAuth.test.ts:42:27

    # Split into failure blocks. Each block starts with " FAIL " or "FAIL "
    fail_pattern = re.compile(
        r"(?:^|\n)\s*(?:×|✗|FAIL)\s+(.+?)(?:\n|$)", re.MULTILINE
    )

    # Find all FAIL header lines with file > test name
    fail_headers = list(fail_pattern.finditer(content))

    for i, match in enumerate(fail_headers):
        header = match.group(1).strip()

        # Determine the block of text after this header (until next header or end)
        start = match.end()
        end = fail_headers[i + 1].start() if i + 1 < len(fail_headers) else len(content)
        block = content[start:end]

        # Parse file and test name from header
        # Format: "src/path/file.test.ts > describe > test name"
        parts = header.split(" > ", 1)
        file_path = parts[0].strip() if parts else header
        test_name = parts[1].strip() if len(parts) > 1 else ""

        # Clean file path — remove ANSI codes and timing info
        file_path = _strip_ansi(file_path).strip()
        # Remove trailing timing like "(12ms)" or "[12ms]"
        file_path = re.sub(r"\s*[\(\[]\d+m?s[\)\]]\s*$", "", file_path)

        failure = {
            "file": _normalize_path(file_path),
            "test": _strip_ansi(test_name),
            "error": "",
            "expected": "",
            "actual": "",
            "source_line": "",
            "stack_file": "",
            "stack_line": 0,
        }

        # Extract error message — first non-empty line in block
        error_match = re.search(
            r"(?:AssertionError|Error|TypeError|ReferenceError|"
            r"TestingLibraryElementError|expect\()"
            r"[:\s]*(.+?)(?:\n|$)",
            block,
            re.IGNORECASE,
        )
        if error_match:
            failure["error"] = _strip_ansi(error_match.group(0)).strip()
        else:
            # Fallback: grab first substantive line
            for line in block.split("\n"):
                stripped = _strip_ansi(line).strip()
                if stripped and not stripped.startswith(("❯", "⎯", "─", "at ")):
                    failure["error"] = stripped
                    break

        # Extract expected / actual
        exp = re.search(r"[-–]\s*Expected\s*[:：]\s*(.+)", block)
        act = re.search(r"\+\s*Received\s*[:：]\s*(.+)", block)
        if exp:
            failure["expected"] = _strip_ansi(exp.group(1)).strip().strip('"\'')
        if act:
            failure["actual"] = _strip_ansi(act.group(1)).strip().strip('"\'')

        # Extract source line — the line with the failing assertion
        src_line_match = re.search(r"❯\s+\d+\s*\|\s*(.+)", block)
        if src_line_match:
            failure["source_line"] = _strip_ansi(src_line_match.group(1)).strip()

        # Extract stack location
        stack_match = re.search(
            r"❯\s+(src/.+?)[:\s]+(\d+)(?::\d+)?", block
        )
        if stack_match:
            failure["stack_file"] = _normalize_path(stack_match.group(1))
            failure["stack_line"] = int(stack_match.group(2))

        # Only add if we have at least a file
        if failure["file"] and not failure["file"].startswith("⎯"):
            failures.append(failure)

    # ── Strategy 2: Fallback — parse "Tests  X failed" summary ─────
    # If we found no structured failures but the summary says tests failed,
    # produce a minimal record so the agent knows something broke.
    if not failures:
        summary_match = re.search(
            r"Tests\s+(\d+)\s+failed", content, re.IGNORECASE
        )
        if summary_match:
            # Try to extract file names from "Test Files  N failed" lines
            file_match = re.search(
                r"Test Files\s+\d+\s+failed\s*\((.+?)\)", content
            )
            failures.append({
                "file": file_match.group(1).strip() if file_match else "unknown",
                "test": "(could not parse individual test names)",
                "error": f"{summary_match.group(1)} test(s) failed — re-run with verbose output",
                "expected": "",
                "actual": "",
                "source_line": "",
                "stack_file": "",
                "stack_line": 0,
            })

    return failures


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences."""
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def _normalize_path(p: str) -> str:
    """Normalize to forward slashes and strip leading ./"""
    return p.replace("\\", "/").lstrip("./")


def main() -> None:
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        if file_path in ("-h", "--help"):
            print(__doc__)
            sys.exit(0)
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                failures = parse_vitest_output(f)
        except FileNotFoundError:
            print(f"Error: file not found: {file_path}", file=sys.stderr)
            sys.exit(1)
        except PermissionError:
            print(f"Error: permission denied: {file_path}", file=sys.stderr)
            sys.exit(1)
    else:
        # Read from stdin
        if sys.stdin.isatty():
            print("Reading from stdin (pipe test output or Ctrl+C to cancel)...",
                  file=sys.stderr)
        failures = parse_vitest_output(sys.stdin)

    # Output
    print(json.dumps(failures, indent=2, ensure_ascii=False))

    # Summary to stderr so it doesn't pollute JSON on stdout
    if failures:
        print(f"\n❌ {len(failures)} failure(s) parsed.", file=sys.stderr)
    else:
        print("\n✅ No failures detected.", file=sys.stderr)


if __name__ == "__main__":
    main()
