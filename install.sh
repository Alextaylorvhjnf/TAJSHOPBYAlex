#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — one-command production installer
#
#  Usage:            sudo ./install.sh
#  Optional domain:  sudo ./install.sh --domain store.example.com
#
#  What it does (idempotent — safe to re-run):
#    1. Detects OS, installs Docker + Compose if missing
#    2. Validates resources (disk/RAM) and project files
#    3. Creates .env from .env.example (never overwrites) + generates AUTH_SECRET
#    4. Builds the Docker image and starts the app on port 3000
#    5. Waits until /api/health answers, then prints next steps
#
#  After it finishes: open http://SERVER_IP:3000/install (or your domain)
#  and the web wizard creates the database schema + admin account.
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_PORT="3000"
HEALTH_PATH="/api/health"

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ ERROR: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$(dirname "$0")"

# ── optional --domain argument ──
DOMAIN_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN_ARG="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

# ── elevate if docker is not usable without root ──
if [ "$(id -u)" -ne 0 ]; then
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    say "Docker needs elevated permissions — re-running with sudo…"
    exec sudo bash "$0" ${DOMAIN_ARG:+--domain "$DOMAIN_ARG"}
  fi
fi

# ╀─ 1. OS + Docker detection ╀─
say "Detecting system…"
OS="unknown"
if command -v apt-get >/dev/null 2>&1; then OS="debian"
elif command -v dnf >/dev/null 2>&1; then OS="rhel"
fi
[ "$OS" = "unknown" ] && warn "Unrecognized package manager (not apt/dnf) — skipping Docker auto-install"

if ! command -v docker >/dev/null 2>&1; then
  say "Docker is not installed — installing it now…"
  case "$OS" in
    debian)
      apt-get update -y
      apt-get install -y docker.io docker-compose-v2
      systemctl enable --now docker
      ;;
    rhel)
      dnf install -y docker docker-compose-plugin
      systemctl enable --now docker
      ;;
    *)
      die "Install Docker manually (https://docs.docker.com/engine/install/), then re-run ./install.sh"
      ;;
  esac
fi
ok "Docker $(docker --version | grep -oE '[0-9.]+' | head -1) present"

# compose (v2 plugin or standalone)
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  die "Docker Compose is not available. Install the docker-compose-plugin package, then re-run."
fi
ok "Docker Compose available"

# ── 2. resource validation ──
say "Validating system resources…"
FREE_MB="$(df -Pm . | awk 'NR==2{print $4}')"
[ "$FREE_MB" -lt 4000 ] && die "Not enough free disk: ${FREE_MB}MB available, ≥4000MB required (image build + data)"
TOTAL_MB="$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096)"
[ "$TOTAL_MB" -lt 1500 ] && warn "Low RAM (${TOTAL_MB}MB) — the image build may fail; ≥2GB recommended"
ok "Disk ${FREE_MB}MB free, RAM ${TOTAL_MB}MB"

# ── 2b. port conflict pre-flight ──
# An older deployment of this app (or any other container) already publishing
# host port 3000 would make `docker compose up` fail with EADDRINUSE. Detect
# it BEFORE building so the message names the exact container to stop.
# (Our own container "taj-electronics" is fine — compose recreates it.)
PORT_HOGS="$(docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | awk '/:3000->/ {print $1}' | grep -v '^taj-electronics$' || true)"
if [ -n "$PORT_HOGS" ]; then
  die "Port 3000 is already used by another container: ${PORT_HOGS}
     Stop it first (e.g. in its folder: docker compose down, or:
     docker stop ${PORT_HOGS} && docker rm ${PORT_HOGS}), then re-run ./install.sh"
fi
ok "Port ${APP_PORT} is free"

# ── 3. project file validation ──
for f in package.json bun.lock Dockerfile docker-compose.yml prisma/schema.prisma .env.example; do
  [ -f "$f" ] || die "Missing project file: $f (are you inside the extracted taj-electronics folder?)"
done
ok "Project files present"

# ── 4. .env handling (never overwrite an existing one) ──
if [ ! -f .env ]; then
  cp .env.example .env
  # generate a strong AUTH_SECRET (openssl → /dev/urandom fallback)
  SECRET=""
  if command -v openssl >/dev/null 2>&1; then
    SECRET="$(openssl rand -hex 32)"
  else
    SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  [ -n "$SECRET" ] || die "Could not generate AUTH_SECRET"
  sed -i.bak "s|^AUTH_SECRET=.*|AUTH_SECRET=${SECRET}|" .env && rm -f .env.bak
  ok ".env created (fresh AUTH_SECRET generated)"
else
  ok ".env already exists — keeping it untouched"
  grep -q "^AUTH_SECRET=." .env || die ".env exists but AUTH_SECRET is empty — set it and re-run"
fi

# optional explicit domain override (only with --domain, by user intent)
if [ -n "$DOMAIN_ARG" ]; then
  if grep -q "^NEXT_PUBLIC_SITE_URL=" .env; then
    sed -i.bak "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://${DOMAIN_ARG}|" .env && rm -f .env.bak
  else
    printf 'NEXT_PUBLIC_SITE_URL=https://%s\n' "$DOMAIN_ARG" >> .env
  fi
  ok "NEXT_PUBLIC_SITE_URL set to https://${DOMAIN_ARG}"
fi

# ── 5. build the image ──
say "Building the Docker image (first build takes a few minutes)…"
$COMPOSE build || die "Docker image build failed — check the output above"

# ── 6. start the application ──
say "Starting TAJ Electronics…"
$COMPOSE up -d --remove-orphans || die "docker compose up failed"

# ── 7. wait for /api/health ──
say "Waiting for the application to become healthy…"
HEALTHY=0
for _ in $(seq 1 60); do
  if $COMPOSE exec -T app node -e "fetch('http://127.0.0.1:${APP_PORT}${HEALTH_PATH}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 2
done
if [ "$HEALTHY" -ne 1 ]; then
  $COMPOSE logs --tail 60 app || true   # best-effort diagnostics; failure is reported below
  $COMPOSE ps || true
  die "Application did not become healthy — inspect the logs above"
fi
ok "Application is healthy (/api/health → 200)"

# ── 8. final status ──
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -n "${SERVER_IP:-}" ] || SERVER_IP="YOUR-SERVER-IP"

echo
$COMPOSE ps
echo
ok "TAJ Electronics is running!"
echo "──────────────────────────────────────────────────────────────"
echo "  1. Open:   http://${SERVER_IP}:${APP_PORT}/install"
echo "             (or https://YOUR-DOMAIN/install if a reverse proxy"
echo "              is already configured — see DEPLOY.md § Nginx)"
echo "  2. The web wizard creates the database + your admin account."
echo "  3. Manage:  ${COMPOSE} ps | logs -f | restart | down"
echo "     Update:  ./update.sh      Backup: ./backup.sh"
echo "──────────────────────────────────────────────────────────────"
