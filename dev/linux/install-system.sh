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
arch="$(dpkg --print-architecture)"
curl -fsSL https://downloads.1password.com/linux/keys/1password.asc | gpg --dearmor --yes --output /usr/share/keyrings/1password-archive-keyring.gpg
printf 'deb [arch=%s signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/%s stable main\n' "$arch" "$arch" > /etc/apt/sources.list.d/1password.list
apt-get update -qq
apt-get install -y 1password-cli
echo 'Linux system tools installed. Run setup.sh as the development user.'
