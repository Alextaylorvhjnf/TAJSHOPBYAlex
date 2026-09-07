# syntax=docker/dockerfile:1
# ───────────────── TAJ Electronics — Production Image (v12) ─────────────────
#
# Multi-stage build:
#   deps    → bun install (pinned Bun 1.4.0)
#   builder → prisma generate + next build (no database needed at build time —
#             every route renders dynamically; verified)
#   cli     → computes the FULL dependency closure of the Prisma CLI so the
#             runtime can run `prisma db push` inside the container (fixes:
#             "Cannot find package 'effect'" / "Cannot find package
#             'fast-check'" from @prisma/config → effect → fast-check and
#             every future missing-CLI-dependency error of that class)
#   runner  → slim Node 22 runtime (Node is REQUIRED: the standalone server.js
#             and the Docker healthcheck both run under node, not bun)
#
# Startup (scripts/docker-entrypoint.sh, order fixed):
#   1. first boot on an empty taj_db volume → install the baked catalog
#      seed database (demo catalog, NO users → the /install wizard still
#      creates the real admin account)
#   2. prisma db push (non-destructive, idempotent schema sync)
#   3. node server.js  ← CMD — runs DIRECTLY, no wrapper process
#
# This replaces the old start-with-migration.js approach (v11 and older),
# which failed with "Cannot find module './server.js'" because it looked
# for the standalone server next to the scripts folder.

# ── 1. dependencies ──
FROM oven/bun:1.4.0 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── 2. build ──
FROM oven/bun:1.4.0 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# v24 fix: Next.js 16 FAILS the build when BOTH src/middleware.ts and
# src/proxy.ts exist ("Please use ./src/proxy.ts only"). Zips never ship a
# middleware file, but a leftover middleware.ts from an older install in the
# build context (or a nested src/src/ copy) must never break `next build`
# again — remove every stale copy before generating/building.
RUN rm -f src/middleware.ts src/middleware.js src/src/middleware.ts src/src/middleware.js
ENV NEXT_TELEMETRY_DISABLED=1
# A throwaway DATABASE_URL: `next build` must never touch a real database
# (the production builder machine has none). All routes are dynamic —
# this value is only used for prisma generate, which needs no connection.
ENV DATABASE_URL="file:/tmp/build-placeholder.db"
RUN bunx prisma generate
RUN bun run build
# guard: the standalone server MUST exist at the expected path
RUN test -f /app/.next/standalone/server.js

# ── 3. prisma CLI closure for the runtime image ──
FROM oven/bun:1.4.0 AS cli
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY scripts/prisma-cli-closure.js ./scripts/prisma-cli-closure.js
# NOTE: this stage is oven/bun — Node.js is NOT installed here, so the script
# must run under bun (it is plain dependency-free CJS, runs identically).
RUN bun scripts/prisma-cli-closure.js /app/node_modules /prisma-cli-dist

# ── 4. runtime ──
FROM node:22-slim AS runner
WORKDIR /app
# openssl CLI (pulls libssl3): REQUIRED for Prisma's runtime platform detection.
# node:22-slim ships no openssl command (Node bundles its own copy), so Prisma
# falls back to the legacy "debian-openssl-1.1.x" binary target and then cannot
# find the query engine → "PrismaClientInitializationError" on every DB query.
# With the CLI present, detection resolves to debian-openssl-3.0.x, whose engine
# is generated in schema.prisma binaryTargets and baked in via the CLI closure.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL="file:/app/db/custom.db"

# standalone Next.js server (server.js + traced node_modules + static + public;
# the `bun run build` script already copies .next/static and public into it)
COPY --from=builder /app/.next/standalone ./
# drop any db leftovers Next may have traced into the output, so the taj_db
# volume mount point is pristine (the seed lives separately in /app/db-seed)
RUN rm -rf db
# Prisma CLI closure overlay (prisma, @prisma/*, effect, fast-check, engines, …)
COPY --from=cli /prisma-cli-dist ./node_modules
# prisma schema — needed by db push (entrypoint) and the /install wizard
COPY --from=builder /app/prisma ./prisma
# catalog seed database (demo catalog, zero users, zero install flag) —
# installed into the empty taj_db volume on FIRST boot only
COPY --from=builder /app/db/catalog-seed.db /app/db-seed/catalog.db

# upload dirs (showcase + sliders ship with demo assets inside public/ from
# the standalone copy above; the taj_uploads volume picks them up on first
# mount — Docker copies image content into a fresh named volume)
RUN mkdir -p db public/uploads/products public/uploads/sliders public/uploads/brands public/uploads/showcase public/uploads/receipts public/uploads/avatars public/uploads/misc

# container start script: seed-on-first-boot → db push → exec server
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

# v29.1: in-container maintenance tool — re-opens the /install wizard after a
# version upgrade over an existing volume (docker compose exec app node
# scripts/reset-install.mjs). Pure Prisma raw-SQL, no app code dependency.
COPY scripts/reset-install.mjs ./scripts/reset-install.mjs

EXPOSE 3000

# Healthcheck uses node (always present in this image — curl is NOT installed):
# verifies the real application answers on /api/health, not just that a
# process exists. 60s start_period covers the first-boot seed + db push.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# CMD is the plain standalone server — the entrypoint prepares the database
# first, then `exec`s this command (no wrapper process stays alive).
ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
