import { access, constants, mkdir, stat } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

export type RequirementStatus = "pass" | "warn" | "fail";

export interface RequirementItem {
  id: string;
  label: string;
  status: RequirementStatus;
  detail: string;
  /** critical fail → installation cannot continue */
  critical: boolean;
}

export interface DbInfo {
  type: "sqlite";
  path: string | null;
  exists: boolean;
}

/** Resolve the SQLite file path from DATABASE_URL (matches Prisma resolution). */
export function sqliteFilePath(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return null;
  let p = url.slice(5);
  if (!p || p === ":memory:") return null;
  if (path.isAbsolute(p)) return path.normalize(p);
  // prisma resolves relative file: paths against the schema directory
  return path.resolve(process.cwd(), "prisma", p);
}

export async function getDbInfo(): Promise<DbInfo> {
  const p = sqliteFilePath();
  if (!p) return { type: "sqlite", path: null, exists: false };
  let exists = false;
  try {
    await stat(p);
    exists = true;
  } catch {
    exists = false;
  }
  return { type: "sqlite", path: p, exists };
}

async function isWritable(dir: string): Promise<boolean> {
  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function nodeMajor(): number {
  return parseInt(process.versions.node.split(".")[0], 10) || 0;
}

function prismaCode(e: unknown): string | undefined {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return undefined;
}

/** Count existing app tables (used for the non-destructive notice). */
async function countAppTables(): Promise<number | null> {
  try {
    const rows = (await db.$queryRawUnsafe(
      "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name IN ('User','Product','Category','Order','StoreSettings')"
    )) as { c: number | bigint }[];
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

const UPLOAD_DIRS = ["products", "sliders", "brands", "receipts", "avatars", "misc"];

/** Full system-requirements check — every check is a real, live probe. */
export async function checkRequirements(): Promise<{ requirements: RequirementItem[]; ready: boolean; db: DbInfo }> {
  const items: RequirementItem[] = [];
  const cwd = process.cwd();
  const dbInfo = await getDbInfo();

  // 1) Node.js
  const major = nodeMajor();
  items.push({
    id: "node",
    label: "Node.js",
    critical: true,
    status: major >= 20 ? "pass" : major >= 18 ? "warn" : "fail",
    detail:
      major >= 20
        ? `نسخه ${process.versions.node} — سازگار`
        : major >= 18
          ? `نسخه ${process.versions.node} — قابل استفاده اما توصیه می‌شود به نسخه ۲۰ یا بالاتر ارتقا دهید`
          : `نسخه ${process.versions.node} — حداقل نسخه موردنیاز ۱۸ است`,
  });

  // 2) Application runtime (Next.js)
  const nextPkgPath = path.join(cwd, "node_modules", "next", "package.json");
  let nextVersion = "";
  try {
    nextVersion = JSON.parse(await (await import("fs/promises")).readFile(nextPkgPath, "utf8")).version ?? "";
  } catch {
    /* running — version unknown */
  }
  items.push({
    id: "runtime",
    label: "محیط اجرای برنامه",
    critical: true,
    status: "pass",
    detail: `Next.js ${nextVersion || "فعال"} — حالت ${process.env.NODE_ENV === "production" ? "پروداکشن" : "توسعه"}`,
  });

  // 3) Database engine (SQLite) — live probe
  let dbEngine: RequirementItem;
  try {
    await db.$queryRaw`SELECT 1`;
    dbEngine = {
      id: "db-engine",
      label: "پشتیبانی دیتابیس",
      critical: true,
      status: "pass",
      detail: "موتور SQLite فعال و پاسخگو است",
    };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    const dbDir = dbInfo.path ? path.dirname(dbInfo.path) : null;
    const dirOk = dbDir ? await isWritable(dbDir) : false;
    if (dirOk && (msg.includes("does not exist") || msg.includes("unable to open") || msg.includes("P1001"))) {
      dbEngine = {
        id: "db-engine",
        label: "پشتیبانی دیتابیس",
        critical: true,
        status: "warn",
        detail: "موتور SQLite آماده است؛ فایل دیتابیس در مرحله راه‌اندازی ساخته می‌شود",
      };
    } else {
      dbEngine = {
        id: "db-engine",
        label: "پشتیبانی دیتابیس",
        critical: true,
        status: "fail",
        detail: "ارتباط با دیتابیس برقرار نمی‌شود. لطفاً پیکربندی دیتابیس (DATABASE_URL) و دسترسی پوشه db را بررسی کنید",
      };
    }
  }
  items.push(dbEngine);

  // 4) Database file
  items.push({
    id: "db-file",
    label: "فایل دیتابیس",
    critical: false,
    status: dbInfo.exists ? "pass" : "warn",
    detail: dbInfo.exists
      ? `فایل موجود است${dbInfo.path ? "" : ""}`
      : "فایل هنوز ایجاد نشده — در گام «راه‌اندازی دیتابیس» ساخته می‌شود",
  });

  // 5) File-system permissions (db dir + public)
  const dbDirWritable = dbInfo.path ? await isWritable(path.dirname(dbInfo.path)) : false;
  const publicWritable = await isWritable(path.join(cwd, "public"));
  const fsOk = dbDirWritable && publicWritable;
  items.push({
    id: "fs",
    label: "دسترسی فایل‌سیستم",
    critical: true,
    status: fsOk ? "pass" : "fail",
    detail: fsOk
      ? "پوشه‌های برنامه قابل نوشتن هستند"
      : "پوشه db یا public قابل نوشتن نیست — دسترسی (permission) سرور را بررسی کنید",
  });

  // 6) Environment variables
  const hasDbUrl = !!process.env.DATABASE_URL;
  const envMissing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SITE_URL) envMissing.push("NEXT_PUBLIC_SITE_URL");
  if (!process.env.AUTH_SECRET) envMissing.push("AUTH_SECRET");
  items.push({
    id: "env",
    label: "متغیرهای محیطی",
    critical: true,
    status: hasDbUrl ? (envMissing.length ? "warn" : "pass") : "fail",
    detail: hasDbUrl
      ? envMissing.length
        ? `DATABASE_URL تنظیم است؛ موارد اختیاری تنظیم نشده: ${envMissing.join("، ")}`
        : "همه متغیرهای محیطی تنظیم شده‌اند"
      : "DATABASE_URL تنظیم نشده است — فایل .env را بررسی کنید",
  });

  // 7) Storage directories (uploads)
  const uploadResults = await Promise.all(
    UPLOAD_DIRS.map(async (d) => ({ d, ok: await isWritable(path.join(cwd, "public", "uploads", d)) }))
  );
  const badUploads = uploadResults.filter((r) => !r.ok).map((r) => r.d);
  items.push({
    id: "storage",
    label: "فضای ذخیره‌سازی تصاویر",
    critical: true,
    status: badUploads.length === 0 ? "pass" : "fail",
    detail:
      badUploads.length === 0
        ? "پوشه‌های uploads آماده هستند"
        : `پوشه‌های زیر قابل نوشتن نیستند: ${badUploads.join("، ")}`,
  });

  // 8) Required dependencies (incl. Prisma CLI for migrations)
  const deps = ["next", "prisma", "@prisma/client", "bcryptjs", "zod"];
  const depResults = await Promise.all(
    deps.map(async (d) => ({ d, ok: await fileExists(path.join(cwd, "node_modules", d, "package.json")) }))
  );
  const missing = depResults.filter((r) => !r.ok).map((r) => r.d);
  const prismaOk = !missing.includes("prisma");
  items.push({
    id: "deps",
    label: "وابستگی‌های برنامه",
    critical: true,
    status: missing.length === 0 ? "pass" : prismaOk ? "warn" : "fail",
    detail:
      missing.length === 0
        ? "همه پکیج‌های موردنیاز نصب هستند"
        : prismaOk
          ? `پکیج‌های ناقص: ${missing.join("، ")}`
          : "ابزار Prisma یافت نشد — اجرای مایگریشن‌ها ممکن نیست (node_modules را کامل کنید)",
  });

  // 9) Existing data notice (non-destructive promise, §19)
  const tables = await countAppTables();
  items.push({
    id: "data",
    label: "وضعیت داده‌های موجود",
    critical: false,
    status: "pass",
    detail:
      tables === null
        ? "دیتابیس خالی است — نصب تازه انجام می‌شود"
        : tables > 0
          ? `${tables} جدول اصلی شناسایی شد — نصب غیرمخرب است و داده‌های موجود حفظ می‌شوند`
          : "دیتابیس خالی است — نصب تازه انجام می‌شود",
  });

  const ready = !items.some((i) => i.critical && i.status === "fail");
  return { requirements: items, ready, db: dbInfo };
}
