import { promises as fsp } from "fs";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { fail, getClientIp } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { getCurrentVersion } from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────
 * v32 · PRE-UPDATE FULL BACKUP (Task 10-a) — GET /api/admin/backup
 * ────────────────────────────────────────────────────────────────────────
 * SUPER_ADMIN only (same guard style as /api/admin/update/apply). Builds a
 * complete store backup ZIP IN MEMORY (adm-zip, imported the same lazy way
 * as src/lib/updater.ts) and streams it as an attachment download:
 *
 *   • db/custom.db  — the live SQLite database (products, customers,
 *                     brands, orders, settings — everything). The file is
 *                     located via DATABASE_URL (file:…) first, falling back
 *                     to <cwd>/db/custom.db. Skipped when absent.
 *   • .env          — server environment (auth secret, db url…), if present.
 *   • uploads       — every user-uploaded file, walked recursively. This
 *                     app stores uploads under public/uploads/ (and a root
 *                     uploads/ is included too when it exists); zip entries
 *                     mirror the REAL on-disk paths so «unzip over a fresh
 *                     install» restores everything exactly in place.
 *   • BACKUP-INFO.json — { generatedAt, appVersion, notes } at zip root.
 *
 * Every single file add is wrapped in try/catch — a missing or locked file
 * is skipped (recorded in the admin log) and never fails the whole backup.
 * The update flow itself never touches db/ / .env / uploads — this endpoint
 * is the admin's OWN safety net, taken BEFORE pressing «ادامهٔ به‌روزرسانی».
 * ──────────────────────────────────────────────────────────────────────── */

const APP_ROOT = process.cwd();

/** Locate the live SQLite file: DATABASE_URL (file:…) first, then the
 * conventional <cwd>/db/custom.db. Returns null when nothing exists. */
async function resolveDatabaseFile(): Promise<string | null> {
  const candidates: string[] = [];
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("file:")) {
    const raw = decodeURIComponent(url.slice(5).split("?")[0]);
    candidates.push(path.isAbsolute(raw) ? raw : path.join(APP_ROOT, raw));
  }
  candidates.push(path.join(APP_ROOT, "db", "custom.db"));
  for (const candidate of candidates) {
    try {
      const stat = await fsp.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

interface BackupFile {
  entry: string;
  abs: string;
}

interface DirentLike {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

/** Recursively collect regular files under `dir`, mapping each to its zip
 * entry name (`<entryRoot>/<relative path>`). Broken symlinks/locked dirs
 * are simply not listed — each read is guarded again at add-time. */
async function collectFiles(dir: string, entryRoot: string, out: BackupFile[]): Promise<number> {
  let entries: DirentLike[];
  try {
    entries = (await fsp.readdir(dir, { withFileTypes: true })) as unknown as DirentLike[];
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const entryName = entryRoot ? `${entryRoot}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      count += await collectFiles(abs, entryName, out);
    } else if (entry.isFile()) {
      out.push({ entry: entryName, abs });
      count++;
    }
  }
  return count;
}

/** Gregorian yyyy-MM-dd (fixed-length, UTC) for the download filename. */
function gregorianDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET — SUPER_ADMIN only: build and download the full store backup ZIP.
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  const ip = getClientIp(req);

  if (admin.role !== "SUPER_ADMIN") {
    await logAdmin(admin.id, "UPDATE_BACKUP_DENIED", {
      entity: "backup",
      ip,
      metadata: { role: admin.role },
    });
    return fail("فقط مدیر ارشد (SUPER_ADMIN) می‌تواند بکاپ کامل بگیرد", 403);
  }

  try {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();

    let dbIncluded = false;
    let envIncluded = false;
    let uploadFiles = 0;
    const skipped: string[] = [];

    /* ① database — everything (products, customers, brands, orders, settings) */
    const dbFile = await resolveDatabaseFile();
    if (dbFile) {
      try {
        zip.addFile("db/custom.db", await fsp.readFile(dbFile));
        dbIncluded = true;
      } catch {
        skipped.push("db/custom.db");
      }
    }

    /* ② .env — server configuration (auth secret, DATABASE_URL, …) */
    const envPath = path.join(APP_ROOT, ".env");
    if (existsSync(envPath)) {
      try {
        zip.addFile(".env", await fsp.readFile(envPath));
        envIncluded = true;
      } catch {
        skipped.push(".env");
      }
    }

    /* ③ uploads — user media, walked recursively, zip paths mirror disk */
    const uploadRoots = [
      { dir: path.join(APP_ROOT, "uploads"), root: "uploads" },
      { dir: path.join(APP_ROOT, "public", "uploads"), root: "public/uploads" },
    ];
    for (const { dir, root } of uploadRoots) {
      if (!existsSync(dir)) continue;
      const files: BackupFile[] = [];
      uploadFiles += await collectFiles(dir, root, files);
      for (const file of files) {
        try {
          zip.addFile(file.entry, await fsp.readFile(file.abs));
        } catch {
          skipped.push(file.entry);
        }
      }
    }

    /* ④ BACKUP-INFO.json — provenance + restore instructions at zip root */
    const info = {
      generatedAt: new Date().toISOString(),
      appVersion: getCurrentVersion(),
      notes: "Full store backup — database + environment + uploads. Restore: unzip over a fresh install, then restart.",
    };
    zip.addFile("BACKUP-INFO.json", Buffer.from(JSON.stringify(info, null, 2), "utf8"));

    if (!dbIncluded && !envIncluded && uploadFiles === 0) {
      return fail("هیچ داده‌ای برای بکاپ پیدا نشد — دیتابیس، فایل .env و پوشهٔ uploads همگی غایب‌اند", 500);
    }

    const buffer = zip.toBuffer();
    const filename = `taj-backup-${gregorianDateStamp()}.zip`;
    /* Uint8Array view — Buffer<ArrayBufferLike> is not assignable to the
     * fetch BodyInit type; wrapping the SAME memory as Uint8Array<ArrayBuffer>
     * (no copy) satisfies it. Node Buffers always back an ArrayBuffer. */
    const body = new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength);

    await logAdmin(admin.id, "UPDATE_BACKUP_DOWNLOAD", {
      entity: "backup",
      entityId: filename,
      ip,
      metadata: {
        bytes: buffer.length,
        dbIncluded,
        envIncluded,
        uploadFiles,
        skipped: skipped.length,
        ...(skipped.length > 0 ? { skippedList: skipped.slice(0, 20) } : {}),
      },
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته";
    return fail(`ساخت فایل بکاپ ناموفق بود — ${msg}`, 500);
  }
}
