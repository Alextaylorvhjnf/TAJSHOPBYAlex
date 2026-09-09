import { spawn } from "child_process";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Runs the project's EXISTING migration system (prisma db push) as a subprocess.
 *
 * Non-destructive by design (§19): `--accept-data-loss` is NEVER passed —
 * if the target database has drifted incompatibly, Prisma refuses to proceed
 * and the error is surfaced to the user instead of destroying data.
 *
 * v34.1 hardening (three real-world VPS reports fixed here):
 *
 *  1) BIN RESOLUTION — the shipped runtime image carries a BUNDLED
 *     `node_modules/.bin/prisma` monolith that resolves its wasm engines
 *     NEXT TO ITSELF (.bin/) instead of prisma/build/, so the wizard died
 *     with `ENOENT: prisma_schema_build_bg.wasm` → «ایجاد ساختار دیتابیس
 *     ناموفق بود». The REAL CLI entry (node_modules/prisma/build/index.js)
 *     resolves everything correctly, so it is now preferred FIRST; .bin is
 *     only a fallback (and the packaging fixes the shim anyway).
 *
 *  2) ENV SELF-HEAL — Docker-era deployments never wrote DATABASE_URL into
 *     .env (compose injected it at runtime); a host install preserving such
 *     an .env starts with no usable DB URL and EVERY query fails. The wizard
 *     now self-heals: a canonical file:<cwd>/db/custom.db URL is written into
 *     .env (keeping every other line) and exported before prisma runs.
 *
 *  3) CLIENT RESET — `prisma db push` rewrites the SQLite file underneath
 *     open connections; the app's cached PrismaClient is dropped right
 *     after a successful push so the next query re-opens the fresh file
 *     (also cures any client built against a pre-heal environment).
 */
export type DbPushResult = { ok: boolean; message: string; log: string[]; envFixed?: boolean };

const PRISMA_BIN = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const PRISMA_JS = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** v34.1: repair a missing/stale DATABASE_URL before any DB work.
 * Returns true when .env was actually rewritten. Safe to call repeatedly. */
export async function ensureDatabaseEnv(): Promise<boolean> {
  let url = process.env.DATABASE_URL ?? "";
  let needsRewrite = false;
  // a URL is usable when it is a file: URL whose directory exists (prisma
  // creates the file itself). Anything else (empty, /app/… docker path,
  // foreign host path) is replaced with the canonical location.
  const m = /^file:(.*)$/.exec(url);
  const filePath = m ? m[1] : "";
  if (!filePath || !(await exists(path.dirname(filePath)))) needsRewrite = true;

  if (!needsRewrite) return false;

  const canonicalDir = path.join(process.cwd(), "db");
  const canonical = `file:${path.join(canonicalDir, "custom.db")}`;
  await mkdir(canonicalDir, { recursive: true });

  // persist into .env (create if absent, keep every other line intact)
  const envPath = path.join(process.cwd(), ".env");
  let content = "";
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    content = "";
  }
  if (/^DATABASE_URL=/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${canonical}`);
  } else {
    content = `${content.trimEnd()}\nDATABASE_URL=${canonical}\n`;
  }
  await writeFile(envPath, content.endsWith("\n") ? content : content + "\n", "utf8");
  process.env.DATABASE_URL = canonical;
  // drop any Prisma client built against the broken env — the next
  // query rebuilds it from the healed process.env (no server restart needed).
  const { resetDbClient } = await import("@/lib/db");
  resetDbClient();
  return true;
}

export async function runDbPush(): Promise<DbPushResult> {
  // v34.1: self-heal the env FIRST — without a valid DATABASE_URL the prisma
  // CLI itself refuses to start ("Environment variable not found").
  let envFixed = false;
  try {
    envFixed = await ensureDatabaseEnv();
  } catch {
    /* healing is best-effort; prisma will surface a readable error if it fails */
  }

  let cmd: string;
  let args: string[];

  // v34.1: prefer the REAL CLI entry — the bundled .bin monolith in older
  // packages crashed with ENOENT (wasm looked up inside .bin/).
  if (await exists(PRISMA_JS)) {
    cmd = process.execPath;
    args = [PRISMA_JS, "db", "push", "--skip-generate"];
  } else if (await exists(PRISMA_BIN)) {
    cmd = PRISMA_BIN;
    args = ["db", "push", "--skip-generate"];
  } else {
    cmd = "bunx";
    args = ["prisma", "db", "push", "--skip-generate"];
  }

  return new Promise((resolve) => {
    const log: string[] = [];
    let settled = false;
    const finish = (r: DbPushResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(r);
      }
    };
    /* NOTE (v34.1): no unconditional client reset here. `prisma db push`
       ALTERs the SQLite file IN PLACE (same inode) — a healthy open client
       stays valid, and $disconnect()-ing the SHARED global client while the
       Telegram poller is mid-query segfaults the whole server (native
       engine teardown race). A reset is ONLY needed when the env was
       actually healed (poisoned client built against a broken DATABASE_URL)
       — ensureDatabaseEnv() already did exactly that, gated on envFixed. */
    let child: ReturnType<typeof spawn>;
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* noop */
      }
      finish({
        ok: false,
        message: "اجرای مایگریشن بیش از حد طول کشید — لطفاً دوباره تلاش کنید",
        log,
      });
    }, 180_000);

    try {
      child = spawn(cmd, args, {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      clearTimeout(timer);
      return resolve({
        ok: false,
        message: "اجرای ابزار مایگریشن ممکن نشد — لطفاً با پشتیبانی تماس بگیرید",
        log,
      });
    }
    const push = (d: Buffer) => {
      for (const line of d.toString().split("\n")) {
        const t = line.trim();
        if (t) log.push(t);
      }
      if (log.length > 400) log.splice(0, log.length - 400);
    };
    child.stdout?.on("data", push);
    child.stderr?.on("data", push);

    child.on("error", () =>
      finish({
        ok: false,
        message: "ابزار Prisma اجرا نشد — وابستگی‌های برنامه را بررسی کنید",
        log,
      })
    );

    child.on("close", (code) => {
      if (code === 0) {
        finish({
          ok: true,
          envFixed,
          message: envFixed
            ? "DATABASE_URL در فایل .env ترمیم و ساختار دیتابیس ایجاد شد"
            : "ساختار دیتابیس با موفقیت ایجاد و همگام‌سازی شد",
          log,
        });
      } else {
        // surface a friendly, non-technical reason; raw log stays in the wizard log view (no secrets)
        const hasDrift = log.some((l) => /data loss|destructive|warn/i.test(l));
        finish({
          ok: false,
          message: hasDrift
            ? "به دلیل تغییرات ناسازگار با داده‌های موجود، اجرای غیرمخرب متوقف شد — داده‌های شما حفظ شده‌اند"
            : "ایجاد ساختار دیتابیس ناموفق بود — جزئیات در گزارش زیر",
          log,
        });
      }
    });
  });
}
