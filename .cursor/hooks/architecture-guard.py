#!/usr/bin/env python3
"""
Architecture Guard — Cursor Hook
Enforces layered-architecture import rules on modified files.

Rule 1 (UI Purity):
    Files in src/components/ui/ must NOT import from @/features/*.
    Generic UI components cannot depend on domain-specific features.
    → BLOCKS the edit.

Rule 2 (Feature Isolation):
    Files in src/features/A/ should NOT import from src/features/B/
    (cross-feature imports), UNLESS the import targets a shared type
    file (types/*.ts).
    → WARNS but does not block.

Registered under: afterFileEdit  (blocks)
                  beforeSubmitPrompt  (warns)

Stdin:  JSON  (varies by hook event)
Stdout: JSON  {"continue": bool, ...}
"""

import json
import os
import re
import sys


# ---------------------------------------------------------------------------
# Import-parsing helpers
# ---------------------------------------------------------------------------

# Matches:  import ... from '...'  /  import ... from "..."
# Also handles:  import '...'  (side-effect imports)
# Also handles:  export ... from '...'
IMPORT_RE = re.compile(
    r"""(?:import|export)\s+"""          # import or export keyword
    r"""(?:.*?\s+from\s+)?"""            # optional default/named bindings
    r"""['"]([^'"]+)['"]""",             # the module specifier (group 1)
    re.MULTILINE,
)

# Dynamic imports:  import('...')  /  await import('...')
DYNAMIC_IMPORT_RE = re.compile(
    r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)""",
    re.MULTILINE,
)

# require():  require('...')
REQUIRE_RE = re.compile(
    r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""",
    re.MULTILINE,
)


def parse_imports(source: str) -> list[str]:
    """Extract every import/require specifier from TypeScript/JavaScript source."""
    specifiers: list[str] = []
    for pattern in (IMPORT_RE, DYNAMIC_IMPORT_RE, REQUIRE_RE):
        specifiers.extend(pattern.findall(source))
    return specifiers


def normalize_path(p: str) -> str:
    """Forward-slash normalised, lowercase drive letter."""
    return p.replace("\\", "/")


def extract_feature_name(file_path: str) -> str | None:
    """Return the feature folder name if *file_path* is inside src/features/<name>/."""
    match = re.search(r"src/features/([^/]+)", file_path)
    return match.group(1) if match else None


def is_shared_type_import(specifier: str) -> bool:
    """True when the import points at a /types/ barrel or a types file."""
    norm = normalize_path(specifier)
    # @/features/equipment/types  or  @/features/equipment/types/equipment
    if "/types" in norm:
        return True
    return False


# ---------------------------------------------------------------------------
# Rule checks
# ---------------------------------------------------------------------------

def check_ui_purity(file_path: str, imports: list[str]) -> dict | None:
    """Rule 1: src/components/ui files must not import from @/features."""
    violating: list[str] = []
    for spec in imports:
        norm = normalize_path(spec)
        if norm.startswith("@/features") or norm.startswith("@/features/"):
            violating.append(spec)

    if not violating:
        return None

    return {
        "rule": "UI Purity",
        "file": file_path,
        "violating_imports": violating,
        "message": (
            "Architectural Violation: Generic UI components cannot depend on "
            "domain-specific Features. Move the logic up to a container or hook."
        ),
    }


def check_feature_isolation(file_path: str, imports: list[str]) -> dict | None:
    """Rule 2: src/features/A must not import from src/features/B (warn only)."""
    own_feature = extract_feature_name(file_path)
    if not own_feature:
        return None

    cross_imports: list[dict] = []
    for spec in imports:
        norm = normalize_path(spec)

        # Check both alias and relative paths
        other_feature: str | None = None
        if norm.startswith("@/features/"):
            other_feature = norm.split("/")[2] if len(norm.split("/")) > 2 else None
        elif "src/features/" in norm:
            parts = norm.split("src/features/")
            if len(parts) > 1:
                other_feature = parts[1].split("/")[0] if parts[1] else None

        if other_feature and other_feature != own_feature:
            if is_shared_type_import(spec):
                continue  # shared types are allowed
            cross_imports.append({
                "import": spec,
                "target_feature": other_feature,
            })

    if not cross_imports:
        return None

    targets = ", ".join(sorted({ci["target_feature"] for ci in cross_imports}))
    return {
        "rule": "Feature Isolation",
        "file": file_path,
        "own_feature": own_feature,
        "cross_imports": cross_imports,
        "message": (
            f"Architectural Warning: Feature '{own_feature}' imports from "
            f"feature(s) [{targets}]. Cross-feature dependencies should go "
            f"through shared types, a common service layer, or be lifted to "
            f"a parent route/container."
        ),
    }


# ---------------------------------------------------------------------------
# File reading helper
# ---------------------------------------------------------------------------

def read_file_source(file_path: str, project_root: str) -> str | None:
    """Read and return file contents, or None if the file cannot be read."""
    abs_path = (
        file_path
        if os.path.isabs(file_path)
        else os.path.join(project_root, file_path)
    )
    try:
        with open(abs_path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except (FileNotFoundError, PermissionError, OSError):
        return None


# ---------------------------------------------------------------------------
# Resolve modified files from hook input
# ---------------------------------------------------------------------------

def get_modified_files(data: dict) -> list[str]:
    """
    Extract file paths from the hook input regardless of event type.
    afterFileEdit  →  data["path"]  (single file)
    beforeSubmitPrompt → data.get("files", []) or data.get("path", "")
    """
    files: list[str] = []

    # Single path field
    path = data.get("path", "")
    if isinstance(path, str) and path:
        files.append(path)

    # List of files (beforeSubmitPrompt may include modified files)
    file_list = data.get("files", [])
    if isinstance(file_list, list):
        for f in file_list:
            if isinstance(f, str) and f:
                files.append(f)

    return files


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # ---- parse stdin --------------------------------------------------------
    try:
        raw = sys.stdin.read()
        data: dict = json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, TypeError):
        _allow()
        return

    # ---- resolve project root -----------------------------------------------
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))

    # ---- collect files to check ---------------------------------------------
    modified_files = get_modified_files(data)
    if not modified_files:
        _allow()
        return

    # ---- run checks ---------------------------------------------------------
    violations: list[dict] = []   # UI Purity – hard block
    warnings: list[dict] = []     # Feature Isolation – soft warn

    for file_path in modified_files:
        norm_path = normalize_path(file_path)

        # Only check TS/TSX/JS/JSX files
        if not re.search(r"\.(tsx?|jsx?)$", norm_path):
            continue

        is_ui_file = "src/components/ui/" in norm_path
        is_feature_file = "src/features/" in norm_path

        if not is_ui_file and not is_feature_file:
            continue

        source = read_file_source(file_path, project_root)
        if source is None:
            continue

        imports = parse_imports(source)

        # Rule 1: UI Purity (block)
        if is_ui_file:
            result = check_ui_purity(norm_path, imports)
            if result:
                violations.append(result)

        # Rule 2: Feature Isolation (warn)
        if is_feature_file:
            result = check_feature_isolation(norm_path, imports)
            if result:
                warnings.append(result)

    # ---- produce output -----------------------------------------------------

    # Hard violations → block
    if violations:
        error_payload = {
            "error": "Architectural Violation",
            "violations": violations,
            "message": violations[0]["message"],
        }
        response = {
            "continue": False,
            "user_message": violations[0]["message"],
            "agent_message": json.dumps(error_payload),
        }
        print(json.dumps(response))
        sys.exit(0)

    # Soft warnings → allow but warn
    if warnings:
        warn_payload = {
            "warning": "Architectural Warning",
            "warnings": warnings,
            "message": warnings[0]["message"],
        }
        response = {
            "continue": True,
            "user_message": warnings[0]["message"],
            "agent_message": json.dumps(warn_payload),
        }
        print(json.dumps(response))
        sys.exit(0)

    # No issues
    _allow()


def _allow() -> None:
    """Emit the default 'continue' response and exit."""
    print(json.dumps({"continue": True}))
    sys.exit(0)


if __name__ == "__main__":
    main()
