#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  TAJ Electronics — re-open the /install wizard (v29.1)
 *
 *  USE CASE: a new version was deployed over an existing Docker volume.
 *  The old InstallationState row (installed=true) makes /install redirect
 *  to / forever, so the first-run wizard can never run again. This script
 *  deletes ONLY that flag row — products, orders, users, uploads and every
 *  setting are untouched. The wizard is idempotent:
 *    • it creates a NEW admin (old admins keep working),
 *    • settings-init only fills empty defaults,
 *    • the demo-catalog import is skipped when products already exist.
 *
 *  RUN INSIDE DOCKER (recommended):
 *      docker compose exec app node scripts/reset-install.mjs
 *
 *  RUN FROM THE REPO ROOT (non-docker / bare-metal):
 *      node scripts/reset-install.mjs
 *  (reads DATABASE_URL from the environment or .env; defaults to
 *   ./db/custom.db like the app does)
 * ══════════════════════════════════════════════════════════════════════ */

import fs from "node:fs";
import path from "node:path";

/* ── resolve DATABASE_URL (env → .env → default) ── */
function resolveDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(import.meta.dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return "file:" + path.join(import.meta.dirname, "..", "db", "custom.db");
}

const url = resolveDbUrl();
const file = url.replace(/^file:/, "");
if (!fs.existsSync(file)) {
  console.error(`✗ database file not found: ${file}`);
  console.error("  (set DATABASE_URL or run this from the project root)");
  process.exit(1);
}

/* plain Prisma client with an explicit datasource — no app import needed */
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url } } });

try {
  const rows = await db.$queryRawUnsafe('SELECT installed FROM "InstallationState" WHERE id = \'main\'');
  if (rows && rows.length > 0 && !rows[0].installed) {
    console.log("✓ install flag is already cleared — /install is open. Nothing to do.");
  } else {
    /* NOT a DELETE: state.ts legacy detection treats a missing row +
     * existing admin users as "installed" and would instantly re-lock the
     * wizard. An explicit installed=false row is the canonical open signal. */
    await db.$executeRawUnsafe(
      'INSERT OR REPLACE INTO "InstallationState" (id, installed, version, adminUserId, installedAt, updatedAt) ' +
        "VALUES ('main', 0, '1.0.0', NULL, datetime('now'), datetime('now'))"
    );
    console.log("✓ install flag cleared — the /install wizard is open again.");
    console.log("  Open https://<your-domain>/install and run the wizard.");
    console.log("  (data is preserved: products, orders, users and settings are untouched)");
  }
} catch (e) {
  console.error("✗ failed:", e && e.message ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
