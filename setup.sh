#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — fresh-server setup (Ubuntu 24.04 / Debian 12+)
#
#  Usage:            sudo bash setup.sh
#
#  Installs EVERY host requirement on a blank server:
#    • Docker Engine + Docker Compose (v2 plugin + standalone alias)
#    • Node.js 22 (NodeSource)
#    • Bun (official installer, /usr/local/bin)
#    • OpenSSL, curl, git, ca-certificates, build tools
#
#  Safe to re-run (idempotent): existing installs are detected and kept.
#  After it finishes, run the app itself with:
#      sudo ./install.sh          # Docker one-command installer
#  or use the tools directly (see DEPLOY.md for non-Docker options).
# ══════════════════════════════════════════════════════════════════════
set -uo pipefail

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ ERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run with sudo:  sudo bash setup.sh"

# ── 0. distro check ──
if ! command -v apt-get >/dev/null 2>&1; then
  die "This setup script targets Ubuntu/Debian (apt-based). For RHEL use dnf equivalents."
fi
say "Detected apt-based system: $(. /etc/os-release && echo "${PRETTY_NAME:-unknown}")"

# ── 1. base packages + OpenSSL ──
say "Installing base packages (curl, git, OpenSSL, ca-certificates)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git openssl unzip \
  build-essential pkg-config
ok "OpenSSL $(openssl version 2>/dev/null | awk '{print $2}') installed"

# ── 2. Docker Engine (official repository, idempotent) ──
install_docker() {
  say "Installing Docker Engine from the official repository…"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc || \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
  # map unsupported codenames to the nearest docker repo (24.04=noble is supported)
  case "$CODENAME" in
    ""|resolute) CODENAME="noble" ;;
  esac
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
}

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  ok "Docker $(docker --version | grep -oE '[0-9.]+' | head -1) already working"
else
  install_docker || {
    warn "Official Docker repo failed — falling back to the distro package"
    apt-get install -y docker.io docker-compose-v2
  }
  systemctl enable --now docker
  docker info >/dev/null 2>&1 || die "Docker installed but not responding — check: systemctl status docker"
  ok "Docker $(docker --version | grep -oE '[0-9.]+' | head -1) installed and running"
fi

# ── 3. Docker Compose (v2 plugin + standalone `docker-compose` alias) ──
if docker compose version >/dev/null 2>&1; then
  ok "Docker Compose v2 plugin: $(docker compose version 2>/dev/null | head -1)"
else
  die "docker-compose-plugin missing — install it (apt install docker-compose-plugin) and re-run"
fi
# standalone alias for scripts/docs that call `docker-compose`
if ! command -v docker-compose >/dev/null 2>&1; then
  COMPVer="$(docker compose version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
  [ -n "${COMPVer:-}" ] && curl -fsSL "https://github.com/docker/compose/releases/download/v${COMPVer}/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose \
    && ok "Standalone docker-compose alias installed (v${COMPVer})" \
    || warn "Could not install the docker-compose alias (offline?) — 'docker compose' still works"
fi

# ── 4. Node.js 22 (NodeSource) ──
need_node=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
  if [ "${NODE_MAJOR:-0}" -ge 20 ]; then
    ok "Node.js $(node --version) already installed (≥20 — good)"
    need_node=0
  else
    warn "Node.js $(node --version) is too old — installing v22 from NodeSource"
  fi
fi
if [ "$need_node" -eq 1 ]; then
  say "Installing Node.js 22 (NodeSource)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && ok "Node.js $(node --version) installed" \
    || warn "NodeSource setup failed — install Node 22 manually if you need non-Docker runs"
fi

# ── 5. Bun (official installer → /usr/local/bin) ──
if command -v bun >/dev/null 2>&1; then
  ok "Bun $(bun --version) already installed"
else
  say "Installing Bun…"
  curl -fsSL https://bun.sh/install | bash - >/dev/null 2>&1
  BUN_BIN="$HOME/.bun/bin/bun"
  if [ -f "$BUN_BIN" ]; then
    cp "$BUN_BIN" /usr/local/bin/bun && chmod +x /usr/local/bin/bun
    ok "Bun $(bun --version) installed → /usr/local/bin/bun"
  else
    warn "Bun installer failed (offline?) — Docker deployments do NOT need Bun on the host"
  fi
fi

# ── 6. let the admin user run docker without sudo (optional, best-effort) ──
SUDO_USER_NAME="${SUDO_USER:-}"
if [ -n "$SUDO_USER_NAME" ] && [ "$SUDO_USER_NAME" != "root" ]; then
  if id "$SUDO_USER_NAME" >/dev/null 2>&1; then
    usermod -aG docker "$SUDO_USER_NAME" 2>/dev/null \
      && ok "User '$SUDO_USER_NAME' added to the docker group (re-login to activate)" \
      || warn "Could not add $SUDO_USER_NAME to the docker group"
  fi
fi

# ── 7. summary ──
echo
echo "──────────────────────────────────────────────────────────────"
ok "All requirements are in place:"
echo "   Docker        : $(docker --version 2>/dev/null || echo MISSING)"
echo "   Compose       : $(docker compose version 2>/dev/null | head -1 || echo MISSING)"
echo "   Node.js       : $(node --version 2>/dev/null || echo 'not needed for Docker')"
echo "   Bun           : $(bun --version 2>/dev/null || echo 'not needed for Docker')"
echo "   OpenSSL       : $(openssl version 2>/dev/null | awk '{print $2}')"
echo "──────────────────────────────────────────────────────────────"
echo "Next: put the project folder on this server, then run"
echo "   sudo ./install.sh      # builds the Docker image and starts on :3000"
echo "Then open  http://SERVER_IP:3000/install  to create your admin."
echo "──────────────────────────────────────────────────────────────"
