#!/usr/bin/env bash
# Official versioned release, verified before installation into the user's PATH.
set -euo pipefail
version=2.9.7
destination="${XDG_DATA_HOME:-$HOME/.local/share}/equipqr/deno-$version"
mkdir -p "$HOME/.local/bin"
if [[ ! -x "$destination/deno" ]]; then
  case "$(uname -m)" in x86_64) arch=x86_64;; aarch64) arch=aarch64;; *) echo 'Unsupported architecture' >&2; exit 1;; esac
  archive="deno-$arch-unknown-linux-gnu.zip"
  tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
  url="https://github.com/denoland/deno/releases/download/v$version"
  curl -fsSL "$url/$archive" -o "$tmp/$archive"
  curl -fsSL "$url/$archive.sha256sum" -o "$tmp/checksum"
  (cd "$tmp"; sha256sum --check checksum)
  mkdir -p "$destination"
  unzip -q "$tmp/$archive" -d "$destination"
fi
ln -sfn "$destination/deno" "$HOME/.local/bin/deno"
"$HOME/.local/bin/deno" --version
