#!/usr/bin/env bash
set -euo pipefail
[[ "$EUID" -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
# shellcheck source=/dev/null
source /etc/os-release
[[ "$ID" == ubuntu ]] || { echo 'Install Docker Engine for your Linux distribution.' >&2; exit 1; }
apt-get update -qq
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update -qq
version="5:29.8.1-1~ubuntu.${VERSION_ID}~${UBUNTU_CODENAME:-$VERSION_CODENAME}"
apt-get install -y "docker-ce=$version" "docker-ce-cli=$version" containerd.io docker-buildx-plugin docker-compose-plugin
if [[ -n "${SUDO_USER:-}" ]]; then usermod -aG docker "$SUDO_USER"; fi
if [[ -d /run/systemd/system ]]; then systemctl enable --now docker; fi
echo 'Docker installed. The host must permit Docker containers and bridge networking.'
