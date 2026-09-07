#!/bin/sh
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — container entrypoint (v12)
#
#  Startup order (exactly as required):
#      1. FIRST BOOT SEED  — if the taj_db volume is empty, install the
#         baked-in catalog database (demo products/categories/brands/
#         sliders/stories — NO users, NO installation flag, so the
#         /install web wizard stays fully usable and creates the real
#         admin account).
#      2. PRISMA DB PUSH   — non-destructive, idempotent schema sync
#         (keeps an existing database in sync after image updates;
#         never deletes data: no --accept-data-loss).
#      3. START SERVER     — exec node server.js (the Next.js
#         standalone server; replaces this shell as PID 1).
#
#  Portability: all paths resolve from the working directory, so the
#  script also runs outside Docker for local production tests:
#      cd <dir-with-server.js> && sh scripts/docker-entrypoint.sh
#
#  Re-runs are always safe: an existing database is NEVER overwritten.
# ══════════════════════════════════════════════════════════════════════
set -eu

APP_ROOT="$(pwd)"
DB_FILE="${TAJ_DB_FILE:-$APP_ROOT/db/custom.db}"
SEED_DB="${TAJ_SEED_DB:-$APP_ROOT/db-seed/catalog.db}"

log() { printf '\033[1;36m[entrypoint]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[entrypoint]\033[0m %s\n' "$*"; }

mkdir -p "$(dirname "$DB_FILE")"

# ── 1. first-boot catalog seed (only when the volume is EMPTY) ──
if [ ! -s "$DB_FILE" ]; then
  if [ -f "$SEED_DB" ]; then
    log "empty database volume — installing catalog seed (demo catalog, no users)"
    cp "$SEED_DB" "$DB_FILE"
    log "catalog seed installed → $DB_FILE"
  else
    log "empty database volume and no seed shipped — the /install wizard will create the schema"
  fi
else
  log "existing database found — preserving all data"
fi

# ── 2. prisma db push (idempotent, non-destructive schema sync) ──
# The Prisma CLI closure (prisma + @prisma/* + effect + fast-check + …)
# is baked into node_modules by scripts/prisma-cli-closure.js at image
# build time, so the CLI runs fully offline here.
PRISMA_CLI="$APP_ROOT/node_modules/prisma/build/index.js"
if [ -f "$PRISMA_CLI" ]; then
  log "syncing database schema (prisma db push — non-destructive)"
  if node "$PRISMA_CLI" db push --skip-generate; then
    log "database schema is in sync"
  else
    # NEVER crash the app because of a schema drift: the server still
    # boots and the /install wizard surfaces a friendly, actionable
    # error (fail-open, same philosophy as lib/installer/state.ts).
    warn "prisma db push failed — continuing; the /install wizard can retry it"
  fi
else
  warn "prisma CLI not found in the image — skipping schema sync"
fi

# ── 3. start the Next.js standalone server ──
if [ "$#" -gt 0 ]; then
  # explicit command from docker-compose / docker run
  log "starting: $*"
  exec "$@"
fi

log "starting: node server.js (port ${PORT:-3000})"
exec node server.js
