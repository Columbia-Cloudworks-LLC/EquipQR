#!/usr/bin/env bash
# Download missing Commons collage sources; keep existing full-size images.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
python3 - "$repo_root" "$@" <<'PYTHON'
import argparse
import json
import pathlib
import subprocess
import tempfile
import urllib.parse

parser = argparse.ArgumentParser(description="Download missing Wikimedia collage sources")
parser.add_argument("repo_root", type=pathlib.Path)
parser.add_argument("--min-bytes", type=int, default=51200)
parser.add_argument("--marketing-dir", type=pathlib.Path)
args = parser.parse_args()
if args.min_bytes < 1:
    parser.error("--min-bytes must be positive")
destination_dir = args.marketing_dir or args.repo_root / "public/images/marketing"
destination_dir.mkdir(parents=True, exist_ok=True)
recipe = json.loads((args.repo_root / "dev/homepage-collage/recipe.json").read_text())
count = 0
for column in recipe["columns"]:
    for tile in column:
        name = tile["source"]
        if pathlib.Path(name).name != name:
            raise ValueError("Source must be a filename")
        destination = destination_dir / name
        if destination.exists() and destination.stat().st_size >= args.min_bytes:
            print(f"keep {destination}")
            continue
        page = urllib.parse.urlsplit(tile.get("pageUrl", ""))
        host = page.hostname or ""
        if host != "wikimedia.org" and not host.endswith(".wikimedia.org"):
            print(f"skip {name}: no supported Commons URL")
            continue
        filename = urllib.parse.unquote(page.path.rsplit("/", 1)[-1])
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
        with tempfile.NamedTemporaryFile(dir=destination_dir, delete=False) as temp:
            temporary = pathlib.Path(temp.name)
        try:
            subprocess.run(["curl", "-fsSL", "--proto", "=https", "--proto-redir", "=https", "-A",
                            "EquipQR collage harvest (github.equipqr.app)", "--output", str(temporary), url], check=True)
            if temporary.stat().st_size < args.min_bytes:
                raise ValueError(f"Rejected undersized download for {name}")
            temporary.replace(destination)
            count += 1
            print(f"saved {destination}")
        finally:
            temporary.unlink(missing_ok=True)
print(f"download-sources: saved {count} file(s) into {destination_dir}")
PYTHON
