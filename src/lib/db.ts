import { PrismaClient } from '@prisma/client'

/* ────────────────────────────────────────────────────────────────────────
 * v34.1 — LAZY + RESETTABLE client (ported from the v33 hotfix) merged
 * with the v29.1 runtime schema self-heal.
 * ────────────────────────────────────────────────────────────────────────
 *
 * WHY LAZY+RESETTABLE: a server booted with a broken .env (Docker-era
 * deployments never write DATABASE_URL into .env — compose injected it at
 * runtime) used to build a PrismaClient whose datasource URL resolution
 * failed once and stayed failed for the whole process lifetime: every
 * later query (even after the /install wizard repaired .env on disk) kept
 * throwing "Environment variable not found: DATABASE_URL" → generic 500
 * "server-side exception".
 *
 * The proxy defers client construction to FIRST QUERY and resetDbClient()
 * drops a poisoned instance so the next query rebuilds it with the healed
 * environment (called by the installer's ensureDatabaseEnv self-heal AND
 * after a successful `prisma db push`, which rewrites the SQLite file
 * underneath every open connection).
 *
 * WHY GLOBAL: Next.js production bundles can duplicate this module per
 * route, so a plain module-scope export would create one PrismaClient per
 * bundle (multiplied sqlite handles + the duplicated self-heal race that
 * produced «duplicate column name: storeChrome» boot errors). Routing
 * everything through globalThis gives the whole process ONE client, ONE
 * heal promise, and a reset that actually reaches every importer.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __tajHealPromise: Promise<void> | undefined
}

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient()
    }
    const value = Reflect.get(globalForPrisma.prisma as object, prop, receiver)
    return typeof value === 'function' ? value.bind(globalForPrisma.prisma) : value
  },
})

/** Drop the current client (env was healed / DB path changed) — the next
 * query transparently rebuilds it from the CURRENT process.env.
 *
 * v34.1 safety: the global reference is swapped FIRST so every new query
 * builds a fresh client; the old instance is disconnected best-effort.
 * This is only ever called for a POISONED client (built against a broken
 * DATABASE_URL — its engine failed to initialize, so teardown is inert).
 * Never call it for a healthy in-use client: the native engine teardown
 * races in-flight queries (e.g. the Telegram poller) and can hard-crash
 * the process. */
export function resetDbClient(): void {
  const old = globalForPrisma.prisma
  globalForPrisma.prisma = undefined
  if (old) {
    try {
      void old.$disconnect().catch(() => {
        /* best-effort teardown */
      })
    } catch {
      /* engine already down — nothing to tear down */
    }
  }
}

export function getDbClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient()
  return globalForPrisma.prisma
}

/* ────────────────────────────────────────────────────────────────────────
 * v29.1 — runtime schema self-heal (additive; no v28 behavior change)
 * ────────────────────────────────────────────────────────────────────────
 * WHY: a deployment upgraded from an older volume (v28 database carried
 * over by the Docker taj_db volume) can start the v29 app BEFORE the
 * installer's `prisma db push` has added the new columns (push failed,
 * was skipped, or the wizard hasn't reached that step yet). Every Prisma
 * model query then fails with P2022 "column does not exist" → homepage /
 * login / admin APIs all return 500 («خطا در ارتباط با سرور (500)»).
 *
 * WHAT: on first DB access the app checks — via raw SQLite PRAGMA, which
 * works independently of the Prisma model schema — whether the columns
 * this app version needs are present, and adds the missing ones with
 * plain `ALTER TABLE … ADD COLUMN` (non-destructive, idempotent, exactly
 * what `prisma db push` would do for an added nullable column).
 *
 * v34.1 hardening: the heal promise lives on globalThis (one per process
 * — fixes the multi-bundle duplicate-column race) and each ALTER catches
 * its own "duplicate column" error so a concurrent heal can never abort
 * the remaining patches.
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
    // v34.1: «خرید از ربات تلگرامی» footer button link
    '"telegramBotUrl" TEXT',
    // v35: «صنف فروشگاه» (store vertical) — electronics/fashion/beauty/
    // gaming/autoparts (see PUT /api/admin/vertical). Defaults to electronics.
    `"activeVertical" TEXT DEFAULT 'electronics'`,
  ],
}

/** Idempotent, cached-per-process schema guard. Never throws. */
export function ensureRuntimeSchema(): Promise<void> {
  if (typeof window !== 'undefined') return Promise.resolve()
  if (!globalForPrisma.__tajHealPromise) {
    globalForPrisma.__tajHealPromise = healRuntimeSchema().catch((e) => {
      console.warn('[db] runtime schema self-heal skipped:', String(e).slice(0, 200))
    })
  }
  return globalForPrisma.__tajHealPromise
}

async function healRuntimeSchema(): Promise<void> {
  for (const [table, columns] of Object.entries(V29_COLUMN_PATCHES)) {
    let rows: { name: string }[] = []
    try {
      rows = (await db.$queryRawUnsafe(`PRAGMA table_info(${table})`)) as { name: string }[]
    } catch {
      continue // table absent — the installer creates the schema
    }
    if (!rows || rows.length === 0) continue
    const present = new Set(rows.map((r) => r.name))
    for (const col of columns) {
      const bare = col.split(/\s+/)[0].replace(/"/g, '')
      if (present.has(bare)) continue
      try {
        await db.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${col}`)
        console.warn(`[db] self-heal: added missing column ${table.replace(/"/g, '')}.${bare}`)
      } catch (e) {
        // a concurrent heal (another bundle/process) may have added it first —
        // treat "duplicate column" as success, anything else aborts the patch
        if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e
      }
    }
  }
}

/* fire-and-forget on module load: in production the server imports this
 * module during boot, so the columns are usually healed before the first
 * request even arrives; the explicit awaits elsewhere make it deterministic. */
void ensureRuntimeSchema()
