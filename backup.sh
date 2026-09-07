#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — backup script (SQLite database + uploaded images)
#
#  Creates a consistent snapshot:
#    1. Briefly stops the app (a few seconds) so the SQLite file is
#       not mid-write (WAL-consistent copy).
#    2. Tars the two persistent volumes into ./backups/ with a timestamp.
#    3. Starts the app again and verifies health.
#
#  NEVER deletes old backups — rotate/clean them yourself if needed.
#  Restore:  docker compose down && docker volume rm (both) &&
#            docker volume create … && docker run --rm -v … -v $(pwd)/backups:/backup alpine tar xzf …
#            (see DEPLOY.md § Backup & restore for the full procedure)
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ ERROR: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$(dirname "$0")"

[ -f docker-compose.yml ] || die "Run this from the project root (docker-compose.yml not found)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# volume names are pinned by `name: taj-electronics` in docker-compose.yml
DB_VOLUME="taj-electronics_taj_db"
UPLOADS_VOLUME="taj-electronics_taj_uploads"

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p backups

say "Pausing the app for a consistent snapshot…"
$COMPOSE stop app >/dev/null

say "Archiving database + uploads…"
docker run --rm -v "${DB_VOLUME}:/data:ro" -v "$(pwd)/backups:/backup" alpine \
  tar czf "/backup/taj-db-${TS}.tar.gz" -C /data . \
  || { $COMPOSE up -d >/dev/null 2>&1 || true; die "Database backup failed — app restarted"; }

docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" -v "$(pwd)/backups:/backup" alpine \
  tar czf "/backup/taj-uploads-${TS}.tar.gz" -C /data . \
  || warn "Uploads backup failed (database backup is safe)"

say "Starting the app again…"
$COMPOSE up -d >/dev/null

# wait for health before declaring success
HEALTHY=0
for _ in $(seq 1 30); do
  if $COMPOSE exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 2
done
[ "$HEALTHY" -eq 1 ] || die "App did not return healthy after backup — check: docker compose logs app"

ok "Backup complete:"
ls -lh "backups/taj-db-${TS}.tar.gz" 2>/dev/null || true
ls -lh "backups/taj-uploads-${TS}.tar.gz" 2>/dev/null || true
