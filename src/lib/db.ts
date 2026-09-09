import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/* ────────────────────────────────────────────────────────────────────────
 * v29.1 — runtime schema self-heal (additive; no v28 behavior change)
 * ────────────────────────────────────────────────────────────────────────
 * WHY: a deployment upgraded from an older volume (v28 database carried
 * over by the Docker taj_db volume) can start the v29 app BEFORE the
 * container's `prisma db push` has added the new columns (push failed,
 * was skipped, or the entrypoint didn't run). Every Prisma model query
 * then fails with P2022 "column does not exist" → homepage / login /
 * admin APIs all return 500 («خطا در ارتباط با سرور (500)»).
 *
 * WHAT: on first DB access the app checks — via raw SQLite PRAGMA, which
 * works independently of the Prisma model schema — whether the columns
 * this app version needs are present, and adds the missing ones with
 * plain `ALTER TABLE … ADD COLUMN` (non-destructive, idempotent, exactly
 * what `prisma db push` would do for an added nullable column).
 *
 * HOW TO USE: `await ensureRuntimeSchema()` before the first model query
 * in the hot read paths (settings getters, session/auth, installer).
 * The work is cached per process — after the first call it resolves
 * instantly. A failure (non-SQLite, locked file, …) logs a warning and
 * never breaks the request — the regular error handling applies.
 * Extend V29_COLUMN_PATCHES when a future version adds columns.
 * ──────────────────────────────────────────────────────────────────────── */

const V29_COLUMN_PATCHES: Record<string, string[]> = {
  '"User"': ['"recoveryCodeHash" TEXT', '"adminPermissions" TEXT'],
  '"StoreSettings"': [
    `"maintenanceTemplate" TEXT DEFAULT 'tech-dark'`,
    '"maintenanceContent" TEXT',
    '"aiWidgetLogo" TEXT',
    '"templateAiLogos" TEXT',
    '"updateManifestUrl" TEXT',
    // v32 (14-b): store-wide chrome look options (header skin / nav order /
    // actions placement / product hover effect) — JSON, null = defaults
    '"storeChrome" TEXT',
  ],
}

let healPromise: Promise<void> | null = null

/** Idempotent, cached-per-process schema guard. Never throws. */
export function ensureRuntimeSchema(): Promise<void> {
  if (typeof window !== "undefined") return Promise.resolve()
  if (!healPromise) {
    healPromise = healRuntimeSchema().catch((e) => {
      console.warn('[db] runtime schema self-heal skipped:', String(e).slice(0, 200))
    })
  }
  return healPromise
}

async function healRuntimeSchema(): Promise<void> {
  for (const [table, columns] of Object.entries(V29_COLUMN_PATCHES)) {
    const rows = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(${table})`)
    if (!rows || rows.length === 0) continue // table absent — the installer creates the schema
    const present = new Set(rows.map((r) => r.name))
    for (const col of columns) {
      const bare = col.split(/\s+/)[0].replace(/"/g, '')
      if (present.has(bare)) continue
      await db.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${col}`)
      console.warn(`[db] self-heal: added missing column ${table.replace(/"/g, '')}.${bare}`)
    }
  }
}

/* fire-and-forget on module load: in production the server imports this
 * module during boot, so the columns are usually healed before the first
 * request even arrives; the explicit awaits below make it deterministic. */
void ensureRuntimeSchema()
