#!/usr/bin/env python3
"""
Scaffold a new Supabase Edge Function for EquipQR.

Usage:
    python .cursor/skills/edge-function-creator/scripts/scaffold.py <function-name>

Creates:
    supabase/functions/<function-name>/index.ts

The function name must be lowercase kebab-case (e.g., my-new-function).
"""

import os
import re
import sys
from pathlib import Path


def find_repo_root() -> Path:
    """Walk up from this script to find the repo root (contains supabase/)."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "supabase" / "functions").is_dir():
            return current
        current = current.parent
    print("ERROR: Could not find repo root (expected supabase/functions/ directory).")
    sys.exit(1)


def validate_name(name: str) -> None:
    """Ensure the function name is valid kebab-case."""
    if not re.match(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", name):
        print(f"ERROR: '{name}' is not valid kebab-case.")
        print("  Use lowercase letters, numbers, and hyphens (e.g., my-new-function).")
        sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scaffold.py <function-name>")
        sys.exit(1)

    name = sys.argv[1]
    validate_name(name)

    repo_root = find_repo_root()
    functions_dir = repo_root / "supabase" / "functions"
    target_dir = functions_dir / name
    target_file = target_dir / "index.ts"

    # Guard against overwriting
    if target_dir.exists():
        print(f"ERROR: {target_dir.relative_to(repo_root)} already exists.")
        sys.exit(1)

    # Read template
    template_path = Path(__file__).resolve().parent.parent / "templates" / "index.ts.txt"
    if not template_path.is_file():
        print(f"ERROR: Template not found at {template_path}")
        sys.exit(1)

    template = template_path.read_text(encoding="utf-8")
    label = name.upper()
    content = template.replace("{{FUNCTION_NAME}}", label)

    # Create function directory and write index.ts
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file.write_text(content, encoding="utf-8")

    print(f"Created {target_file.relative_to(repo_root)}")
    print()
    print("Next steps:")
    print(f"  1. Edit supabase/functions/{name}/index.ts")
    print(f"  2. Deploy: supabase functions deploy {name}")


if __name__ == "__main__":
    main()
