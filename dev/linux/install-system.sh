#!/usr/bin/env bash
# Native Ubuntu tools shared by local WSL and Codex cloud. Run as root/sudo.
set -euo pipefail
[[ "$EUID" -eq 0 ]] || { echo 'Run sudo bash dev/linux/install-system.sh' >&2; exit 1; }
# shellcheck source=/dev/null
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]] || { echo 'Supported baseline: Ubuntu 24.04.' >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y ca-certificates curl git jq ripgrep python3 unzip xz-utils util-linux build-essential shellcheck ffmpeg gh gpg
echo 'Linux system tools installed. Run setup.sh as the development user.'
