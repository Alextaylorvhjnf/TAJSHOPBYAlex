/* ────────────────────────────────────────────────────────────────────────
 * v29.2 · UPDATE SCRIPT — server-side engine (Task 5-b)
 * ────────────────────────────────────────────────────────────────────────
 * «اسکریپت به‌روزرسانی» lets the store owner upgrade the application code
 * from the admin panel: a manifest JSON hosted on the owner's official
 * GitHub repo (HARDCODED — v32/Task 13-a removed every URL override) is
 * fetched, compared against package.json's version, and when a
 * newer version exists a signed (sha256-verified) ZIP is downloaded and
 * applied — CODE ONLY. Data is untouchable by design:
 *
 *   • db/            (SQLite files — orders, users, products)  NEVER touched
 *   • .env / .env.*                                            NEVER touched
 *   • uploads/, public/uploads/                                NEVER touched
 *   • node_modules/                                             NEVER touched
 *
 * Allowed overwrite targets are ONLY: src/, public/ (minus public/uploads/),
 * scripts/, prisma/ and the root config files (next.config.ts, …, package.json).
 * Before anything is copied the CURRENT files are backed up into
 * db/update-backup-<timestamp>/ (last 2 kept). Progress is persisted in
 * db/update-state.json so the panel can poll /api/admin/update/status.
 *
 * This module is SERVER-ONLY (imported exclusively by API routes).
 * ──────────────────────────────────────────────────────────────────────── */

import { promises as fsp } from "fs";
import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from "fs";
import { createWriteStream, createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { spawn } from "child_process";
import { logSystemEvent } from "@/lib/admin-log";

/* ── constants ── */

const APP_ROOT = process.cwd();

/**
 * v30 · the store's own GitHub distribution channel (added by request):
 * https://github.com/Alextaylorvhjnf/TAJSHOPBYAlex
 * updates/ folder holds update-manifest.json + versioned update zips.
 *
 * v32 (Task 13-a) · PERMANENTLY HARD-WIRED — this is now the ONLY source
 * of the manifest URL. The panel's URL-config UI, the StoreSettings
 * override and the env UPDATE_MANIFEST_URL override were all removed, so
 * «بررسی به‌روزرسانی» always checks the owner's official GitHub repo.
 */
export const GITHUB_MANIFEST_URL =
  "https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main/updates/update-manifest.json";

/**
 * TRUE when the app runs from a prebuilt standalone output (the production
 * Docker image: /app has server.js but NO src/ folder). Used to give the
 * admin an honest hint: panel apply still delivers public/ + prisma schema,
 * but full src changes need ./update.sh on the server host (which rebuilds
 * the image from the same GitHub zip — data volumes are preserved).
 */
export function isStandaloneRuntime(): boolean {
  try {
    return !existsSync(path.join(APP_ROOT, "src"));
  } catch {
    return false;
  }
}

const DB_DIR = path.join(APP_ROOT, "db");
const STATE_FILE = path.join(DB_DIR, "update-state.json");
const DOWNLOAD_FILE = path.join(DB_DIR, "update-download.zip");
const EXTRACT_DIR = path.join(DB_DIR, "update-extract");
const RESTART_MARKER = path.join(DB_DIR, "update-pending-restart.json");
const BACKUP_PREFIX = "update-backup-";

const MAX_ZIP_BYTES = 200 * 1024 * 1024; // 200MB
const DOWNLOAD_TIMEOUT_MS = 120_000; // 120s
const MANIFEST_TIMEOUT_MS = 15_000; // 15s
const MIGRATE_TIMEOUT_MS = 180_000; // 3min
const MANIFEST_MAX_BYTES = 256 * 1024; // 256KB
const STALE_ACTIVE_MS = 15 * 60_000; // an "active" state older than 15min = crashed → allow retry

/** top-level DIRECTORY prefixes an update may overwrite */
const ALLOWED_DIRS = ["src", "public", "scripts", "prisma"] as const;
/** exact ROOT FILES an update may overwrite (new deps live in package.json —
 * the admin is told to run `bun install` afterwards, zip scripts are NEVER run) */
const ALLOWED_ROOT_FILES = [
  "next.config.ts",
  "tailwind.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "components.json",
  "eslint.config.mjs",
  "package.json",
] as const;

/* ── state model ── */

export type UpdatePhase =
  | "idle"
  | "downloading"
  | "verifying"
  | "extracting"
  | "backing-up"
  | "applying"
  | "migrating"
  | "restarting"
  | "done"
  | "error";

export interface UpdateState {
  phase: UpdatePhase;
  percent: number; // 0-100
  message: string; // Persian, human-readable
  version?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  log: string[];
}

const ACTIVE_PHASES: UpdatePhase[] = [
  "downloading",
  "verifying",
  "extracting",
  "backing-up",
  "applying",
  "migrating",
  "restarting",
];

const IDLE_STATE: UpdateState = { phase: "idle", percent: 0, message: "به‌روزرسانی فعلاً بیکار است", log: [] };

/* ── version helpers ── */

/** Current app version — read from package.json (fallback "0.0.0"). */
export function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(APP_ROOT, "package.json"), "utf8")) as { version?: unknown };
    const v = typeof pkg.version === "string" ? pkg.version.trim() : "";
    return v || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** loose semver compare ("29.3.0" vs "29.10.1" — also tolerates a leading v) */
export function compareVersions(a: string, b: string): number {
  const norm = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/i, "")
      .split(/[-+]/)[0]
      .split(".")
      .map((s) => parseInt(s, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export function isNewerVersion(latest: string, current: string): boolean {
  try {
    return compareVersions(latest, current) > 0;
  } catch {
    return false;
  }
}

/* ── manifest ── */

export interface UpdateManifest {
  version: string;
  releasedAt: string | null;
  notes: string | null;
  zipUrl: string | null;
  sha256: string | null;
  minAppVersion: string | null;
}

/**
 * v32 (Task 13-a) · manifest URL resolution — HARDCODED, no configuration:
 * the owner's official GitHub repo (GITHUB_MANIFEST_URL) is the one and
 * only channel. Kept as an async function (and under its historical name)
 * so /check, /poll and /apply keep their existing call shape untouched.
 */
export async function resolveManifestSetting(): Promise<{
  raw: string;
  source: "github";
}> {
  return { raw: GITHUB_MANIFEST_URL, source: "github" };
}

/** a relative manifest URL ("/update/…") is resolved against the request origin */
export function toAbsoluteManifestUrl(raw: string, origin?: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/") && origin) return `${origin}${raw}`;
  return raw;
}

function sanitizeManifest(json: unknown): UpdateManifest {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("ساختار مانیفست نامعتبر است — باید یک آبجکت JSON باشد");
  }
  const o = json as Record<string, unknown>;
  const version = typeof o.version === "string" ? o.version.trim() : "";
  if (!/^\d+(\.\d+){0,3}(-[\w.]+)?$/.test(version)) {
    throw new Error("فیلد version در مانیفست غایب یا نامعتبر است");
  }
  const httpUrl = (v: unknown): string | null =>
    typeof v === "string" && /^https?:\/\/\S+$/i.test(v.trim()) ? v.trim().slice(0, 500) : null;
  const sha = typeof o.sha256 === "string" && /^[a-fA-F0-9]{64}$/.test(o.sha256.trim()) ? o.sha256.trim().toLowerCase() : null;
  const minApp = typeof o.minAppVersion === "string" && /^\d+(\.\d+){0,3}/.test(o.minAppVersion.trim()) ? o.minAppVersion.trim().slice(0, 40) : null;
  return {
    version: version.replace(/^v/, ""),
    releasedAt: typeof o.releasedAt === "string" ? o.releasedAt.slice(0, 40) : null,
    notes: typeof o.notes === "string" ? o.notes.slice(0, 4000) : null,
    zipUrl: httpUrl(o.zipUrl) ?? httpUrl(o.releaseAsset), // GitHub-flavored alias
    sha256: sha,
    minAppVersion: minApp,
  };
}

/** Fetch + parse the manifest with a 15s timeout (Persian errors on failure).
 * v31: `timeoutMs` is optional — the background poll route passes a shorter
 * 10s budget; every other caller keeps the default. */
export async function fetchManifest(
  rawUrl: string,
  origin?: string,
  timeoutMs: number = MANIFEST_TIMEOUT_MS
): Promise<UpdateManifest> {
  const url = toAbsoluteManifestUrl(rawUrl, origin);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("آدرس مانیفست معتبر نیست — باید یک URL کامل http(s) باشد");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // redirect: "follow" is the default — required for GitHub Release asset URLs
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "TAJ-Electronics-Updater/1.0" },
    });
    if (!res.ok) throw new Error(`سرور مانیفست پاسخ داد: ${res.status}`);
    const text = (await res.text()).slice(0, MANIFEST_MAX_BYTES);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("مانیفست یک JSON معتبر نیست");
    }
    return sanitizeManifest(json);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === "AbortError" || /aborted/i.test(err.message)) {
      throw new Error("دریافت مانیفست بیش از ۱۵ ثانیه طول کشید — دوباره تلاش کنید");
    }
    if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(err.message)) {
      throw new Error("اتصال به سرور مانیفست برقرار نشد — آدرس و دسترسی اینترنت سرور را بررسی کنید");
    }
    throw err; // already a Persian message from above
  } finally {
    clearTimeout(timer);
  }
}

/* ── persistent state file (db/update-state.json) ──
 * Synchronous (tiny file, tmp+rename atomic) — no async races between the
 * progress stream callback and the phase steps. db/ is the persisted volume. */

export function readUpdateState(): UpdateState {
  try {
    const raw = readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<UpdateState>;
    if (!parsed || typeof parsed !== "object") return { ...IDLE_STATE };
    return {
      phase: (typeof parsed.phase === "string" ? parsed.phase : "idle") as UpdatePhase,
      percent: typeof parsed.percent === "number" ? Math.max(0, Math.min(100, Math.round(parsed.percent))) : 0,
      message: typeof parsed.message === "string" ? parsed.message : "",
      version: parsed.version ?? null,
      startedAt: parsed.startedAt ?? null,
      finishedAt: parsed.finishedAt ?? null,
      error: parsed.error ?? null,
      log: Array.isArray(parsed.log) ? parsed.log.filter((l) => typeof l === "string").slice(-200) : [],
    };
  } catch {
    return { ...IDLE_STATE };
  }
}

function pushLog(state: UpdateState, lines: string[]): void {
  const stamp = new Date().toISOString().slice(11, 19);
  for (const line of lines) state.log.push(`[${stamp}] ${line}`);
  if (state.log.length > 200) state.log = state.log.slice(-200);
}

function writeUpdateState(patch: Partial<UpdateState>, logLines: string[] = []): UpdateState {
  const state: UpdateState = { ...readUpdateState(), ...patch };
  pushLog(state, logLines);
  try {
    writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify(state), "utf8");
    renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
  } catch {
    /* state file unwritable — the in-process flow continues regardless */
  }
  return state;
}

/** true while an update is genuinely running (stale >15min states are ignored) */
export function isUpdateActive(state: UpdateState): boolean {
  if (!ACTIVE_PHASES.includes(state.phase)) return false;
  const started = state.startedAt ? Date.parse(state.startedAt) : NaN;
  if (Number.isFinite(started) && Date.now() - started > STALE_ACTIVE_MS) return false;
  return true;
}

/* ── restart marker (db/update-pending-restart.json) ── */

export function restartMarkerExists(): boolean {
  try {
    return existsSync(RESTART_MARKER);
  } catch {
    return false;
  }
}

/** consumed by the status route on its FIRST successful poll after restart */
export async function consumeRestartMarker(): Promise<boolean> {
  if (!restartMarkerExists()) return false;
  try {
    unlinkSync(RESTART_MARKER);
  } catch {
    /* already consumed */
  }
  return true;
}

/* ── zip path security ── */

/**
 * Validate ONE zip entry path against the allowlist.
 * Rejects: absolute paths, "..", symlinks, and anything targeting data
 * (db/, .env*, uploads/, public/uploads/, node_modules/, …).
 */
function validateEntryPath(entryName: string, unixAttr: number): { ok: true } | { ok: false; reason: string } {
  const name = entryName ?? "";
  if (!name || name.includes("\0")) return { ok: false, reason: "نام فایل نامعتبر است" };
  if (name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(name)) {
    return { ok: false, reason: `مسیر مطلق ممنوع است (${name})` };
  }
  const segs = name.split(/[\\/]+/).filter((s) => s.length > 0);
  if (segs.length === 0) return { ok: true };
  if (segs.some((s) => s === "..")) return { ok: false, reason: `مسیر شامل «..» ممنوع است (${name})` };

  // symlink? (external attributes: unix mode lives in the high 16 bits)
  const mode = (unixAttr >>> 16) & 0o170000;
  if (mode === 0o120000) return { ok: false, reason: `فایل لینک نمادین (symlink) ممنوع است (${name})` };

  const top = segs[0];
  if (segs.length === 1) {
    if ((ALLOWED_ROOT_FILES as readonly string[]).includes(top)) return { ok: true };
    // top-level DIRECTORY entries ("src/", "public/" …) — adm-zip keeps the
    // trailing slash, the empty-segment filter leaves the bare name
    if ((ALLOWED_DIRS as readonly string[]).includes(top)) return { ok: true };
    if (top === ".env" || top.startsWith(".env.")) return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به .env را ندارد" };
    if (top === "db") return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به پوشهٔ db/ (دیتابیس) را ندارد" };
    if (top === "uploads") return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به پوشهٔ uploads/ (فایل‌های کاربران) را ندارد" };
    return { ok: false, reason: `فایل ریشهٔ «${top}» در فهرست مجاز نیست (فقط src/ ، public/ ، scripts/ ، prisma/ و فایل‌های پیکربندی)` };
  }
  if (top === "public" && segs[1] === "uploads") {
    return { ok: false, reason: "مسیر public/uploads/ (تصاویر بارگذاری‌شدهٔ کاربران) در بستهٔ به‌روزرسانی ممنوع است" };
  }
  if ((ALLOWED_DIRS as readonly string[]).includes(top)) return { ok: true };
  if (top === "db") return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به پوشهٔ db/ (دیتابیس) را ندارد" };
  if (top === ".env" || top.startsWith(".env.")) return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به .env را ندارد" };
  if (top === "node_modules") return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به node_modules را ندارد" };
  if (top === "uploads") return { ok: false, reason: "بستهٔ به‌روزرسانی اجازهٔ دست‌زدن به پوشهٔ uploads/ را ندارد" };
  return { ok: false, reason: `پوشهٔ «${top}/» در فهرست مجاز نیست (فقط src/ ، public/ ، scripts/ ، prisma/ و فایل‌های پیکربندی)` };
}

/** post-extraction paranoia walk: no symlinks, no escapees on disk */
async function assertExtractedTreeSafe(dir: string): Promise<void> {
  const walk = async (d: string): Promise<void> => {
    const entries = await fsp.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      const rel = path.relative(EXTRACT_DIR, full);
      if (rel.split(path.sep).some((s) => s === "..")) {
        throw new Error("فایلی خارج از پوشهٔ استخراج شناسایی شد — بستهٔ مشکوک رد شد");
      }
      const st = await fsp.lstat(full);
      if (st.isSymbolicLink()) throw new Error(`فایل لینک نمادین در بسته ممنوع است (${rel})`);
      if (st.isDirectory()) await walk(full);
    }
  };
  await walk(dir);
}

/* ── file helpers (runtime-proof recursive copy — no fs.cp quirks) ── */

async function copyTree(src: string, dest: string): Promise<number> {
  let count = 0;
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      count += await copyTree(s, d);
    } else if (e.isFile()) {
      await fsp.mkdir(path.dirname(d), { recursive: true });
      await fsp.copyFile(s, d); // overwrites
      count++;
    }
    /* symlinks were rejected before extraction — ignore anything else */
  }
  return count;
}

async function hashFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (d) => h.update(d as Buffer));
    stream.on("end", () => resolve(h.digest("hex")));
    stream.on("error", reject);
  });
}

async function pruneBackups(): Promise<void> {
  try {
    const names = (await fsp.readdir(DB_DIR)).filter((n) => n.startsWith(BACKUP_PREFIX));
    const stamped = await Promise.all(
      names.map(async (n) => {
        const st = await fsp.stat(path.join(DB_DIR, n)).catch(() => null);
        return { n, t: st?.mtimeMs ?? 0 };
      })
    );
    stamped.sort((a, b) => b.t - a.t);
    for (const { n } of stamped.slice(2)) {
      await fsp.rm(path.join(DB_DIR, n), { recursive: true, force: true }).catch(() => null);
    }
  } catch {
    /* prune is best-effort */
  }
}

/* ── the state machine ── */

interface RunParams {
  version: string;
  zipUrl: string;
  sha256?: string | null;
  origin?: string;
}

/* module-level lock (one apply at a time); the state file covers other
 * module instances (dev route bundles) and process restarts. */
let applying = false;

export async function beginUpdate(params: RunParams): Promise<{ started: boolean; reason?: string }> {
  const state = readUpdateState();
  if (applying || isUpdateActive(state)) {
    return { started: false, reason: "یک فرآیند به‌روزرسانی هم‌اکنون در حال اجراست — تا پایان آن منتظر بمانید" };
  }
  applying = true;
  // fresh state
  try {
    writeFileSync(
      STATE_FILE,
      JSON.stringify({
        phase: "downloading",
        percent: 2,
        message: "در حال دانلود فایل به‌روزرسانی…",
        version: params.version,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        error: null,
        log: [],
      } satisfies UpdateState),
      "utf8"
    );
  } catch {
    /* ignore — runUpdate keeps retrying writes */
  }
  // fire-and-forget: the route already responded { started: true }
  void runUpdate(params).catch(async (e) => {
    const msg = e instanceof Error ? e.message : String(e);
    writeUpdateState(
      { phase: "error", message: "به‌روزرسانی با خطا متوقف شد", error: msg, finishedAt: new Date().toISOString() },
      [`خطای غیرمنتظره: ${msg}`]
    );
    await logSystemEvent("UPDATE_APPLY_FAILED", { entity: "update", metadata: { version: params.version, error: msg.slice(0, 500) } }).catch(() => null);
    applying = false;
  });
  return { started: true };
}

function setPhase(phase: UpdatePhase, percent: number, message: string, logLines: string[] = []): void {
  writeUpdateState({ phase, percent, message }, logLines);
}

async function runUpdate(params: RunParams): Promise<void> {
  const { version, zipUrl } = params;
  const sha256 = params.sha256?.toLowerCase() || null;
  try {
    await fsp.mkdir(DB_DIR, { recursive: true });

    /* 1 ── download ─────────────────────────────────────────────── */
    setPhase("downloading", 4, "در حال دانلود فایل به‌روزرسانی…", [`شروع دانلود: ${zipUrl}`]);
    const downloadBytes = await downloadZip(zipUrl);
    writeUpdateState({ percent: 40, message: "دانلود کامل شد" }, [`دانلود کامل شد (${(downloadBytes / 1024 / 1024).toFixed(2)}MB)`]);

    /* 2 ── verify checksum ──────────────────────────────────────── */
    setPhase("verifying", 45, "بررسی چک‌سام SHA-256…");
    if (sha256) {
      const actual = await hashFile(DOWNLOAD_FILE);
      if (actual !== sha256) {
        throw new Error("چک‌سام SHA-256 فایل دانلود‌شده با مانیفست مطابقت ندارد — به‌روزرسانی لغو شد (هیچ تغییری اعمال نشده است)");
      }
      writeUpdateState({ message: "چک‌سام تأیید شد" }, ["چک‌سام SHA-256 تأیید شد ✓"]);
    } else {
      writeUpdateState({ message: "چک‌سام ارائه نشده — بدون تأیید ادامه داده شد" }, [
        "هشدار: مانیفست sha256 نداشت — دانلود بدون تأیید چک‌سام ادامه یافت (توصیه: sha256 اضافه کنید)",
      ]);
    }

    /* 3 ── extract + security validation ────────────────────────── */
    setPhase("extracting", 50, "استخراج و بررسی امنیتی فایل‌ها…");
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(DOWNLOAD_FILE); // throws on a corrupt archive
    const entries = zip.getEntries();
    const replacedFiles: string[] = [];
    for (const e of entries) {
      const verdict = validateEntryPath(e.entryName, e.attr);
      if (!verdict.ok) throw new Error(`بستهٔ به‌روزرسانی رد شد — ${verdict.reason}`);
      if (!e.isDirectory) {
        const segs = e.entryName.split(/[\\/]+/).filter((s) => s.length > 0);
        replacedFiles.push(segs.join("/"));
      }
    }
    if (replacedFiles.length === 0) throw new Error("بستهٔ به‌روزرسانی فایلی برای اعمال ندارد");
    if (replacedFiles.length > 5000) throw new Error("بستهٔ به‌روزرسانی بیش از حد بزرگ است (بیش از ۵۰۰۰ فایل)");
    await fsp.rm(EXTRACT_DIR, { recursive: true, force: true }).catch(() => null);
    await fsp.mkdir(EXTRACT_DIR, { recursive: true });
    zip.extractAllTo(EXTRACT_DIR, true);
    await assertExtractedTreeSafe(EXTRACT_DIR); // lstat walk — symlink/escape double-check
    writeUpdateState({ percent: 55, message: `استخراج کامل شد (${replacedFiles.length.toLocaleString("fa-IR")} فایل)` }, [
      `استخراج کامل شد: ${replacedFiles.length} فایل`,
    ]);

    /* 4 ── backup the files about to be replaced ────────────────── */
    setPhase("backing-up", 60, "پشتیبان‌گیری از فایل‌های فعلی…");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(DB_DIR, `${BACKUP_PREFIX}${stamp}`);
    let backedUp = 0;
    for (const rel of replacedFiles) {
      const current = path.join(APP_ROOT, rel);
      try {
        await fsp.access(current);
      } catch {
        continue; // new file — nothing to back up
      }
      const target = path.join(backupDir, rel);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.copyFile(current, target);
      backedUp++;
    }
    await pruneBackups();
    writeUpdateState({ percent: 75, message: `پشتیبان‌گیری کامل شد (${backedUp.toLocaleString("fa-IR")} فایل)` }, [
      `پشتیبان در db/${BACKUP_PREFIX}${stamp} ذخیره شد (${backedUp} فایل)`,
    ]);

    /* 5 ── apply: copy ONLY allowed paths over the app ───────────── */
    setPhase("applying", 78, "اعمال فایل‌های جدید…");
    let applied = 0;
    const topItems = await fsp.readdir(EXTRACT_DIR, { withFileTypes: true });
    for (const item of topItems) {
      const verdict = validateEntryPath(item.isDirectory() ? `${item.name}/` : item.name, 0);
      if (!verdict.ok) throw new Error(`بستهٔ به‌روزرسانی رد شد — ${verdict.reason}`);
      const src = path.join(EXTRACT_DIR, item.name);
      const dest = path.join(APP_ROOT, item.name);
      if (item.isDirectory()) {
        applied += await copyTree(src, dest);
      } else {
        applied++;
        await fsp.copyFile(src, dest);
      }
    }
    writeUpdateState({ percent: 90, message: `فایل‌ها اعمال شدند (${applied.toLocaleString("fa-IR")} فایل)` }, [
      `${applied} فایل روی کد فعلی اعمال شد`,
    ]);

    /* 6 ── migrate (additive prisma db push — data never dropped) ── */
    setPhase("migrating", 92, "به‌روزرسانی ساختار دیتابیس (داده‌ها دست نمی‌خورند)…");
    const migrateOut = await runMigrate();
    writeUpdateState(
      { message: "مهاجرت دیتابیس اجرا شد" },
      [`prisma db push: ${migrateOut.replace(/\s+/g, " ").slice(0, 300)}`]
    );

    /* 7 ── restart marker + done ────────────────────────────────── */
    setPhase("restarting", 97, "آمادهٔ راه‌اندازی مجدد…");
    try {
      await fsp.writeFile(RESTART_MARKER, JSON.stringify({ version, at: new Date().toISOString() }), "utf8");
    } catch {
      /* marker best-effort */
    }
    const standalone = isStandaloneRuntime();
    if (standalone) {
      // Docker / standalone build: public/ assets + prisma/ schema + db push
      // are applied inside the container, but compiled server code only
      // changes after a rebuild — tell the admin exactly that (update.sh on
      // the server host performs the same GitHub download + rebuild, data
      // volumes are preserved).
      setPhase(
        "done",
        100,
        `به‌روزرسانی ${version} نصب شد — فایل‌های عمومی و ساختار دیتابیس اعمال شد. برای اعمال کامل کدها در نصب داکری، در ترمینال سرور «./update.sh» را اجرا کنید (داده‌ها محفوظ می‌مانند)`,
        [
          `نسخهٔ نصب‌شده: ${version}`,
          "محیط standalone/داکر: تغییرات src پس از rebuild تصویر (./update.sh روی سرور) کامل اعمال می‌شود",
        ]
      );
    } else {
      setPhase("done", 100, `به‌روزرسانی ${version} با موفقیت نصب شد — در حال راه‌اندازی مجدد`, [
        `نسخهٔ نصب‌شده: ${version}`,
      ]);
    }
    await logSystemEvent("UPDATE_APPLY_DONE", { entity: "update", metadata: { version, files: applied } }).catch(() => null);

    /* 8 ── restart the process (response already sent long ago).
     * In production (Docker restart policy / pm2 / systemd) the supervisor
     * brings the app back up on the NEW code. In dev we skip the hard exit
     * — `next dev` hot-reloads the changed files automatically and killing
     * the shared dev server would take the whole preview down. */
    if (process.env.NODE_ENV === "production" || process.env.UPDATE_FORCE_RESTART === "1") {
      writeUpdateState({ message: `به‌روزرسانی ${version} نصب شد — فرآیند برای بارگذاری کد جدید ری‌استارت می‌شود` }, [
        "زمان‌بندی ری‌استارت فرآیند (۸۰۰ms)",
      ]);
      setTimeout(() => process.exit(0), 800).unref?.();
    } else {
      writeUpdateState({ message: `به‌روزرسانی ${version} نصب شد (محیط توسعه — هات‌ریلود فعال است، صفحه را رفرش کنید)` }, [
        "محیط توسعه: ری‌استارت خودکار انجام نشد — کد جدید با هات‌ریلود فعال می‌شود",
      ]);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeUpdateState(
      {
        phase: "error",
        percent: 100,
        message: "به‌روزرسانی با خطا متوقف شد — هیچ داده‌ای تغییر نکرده است",
        error: msg,
        finishedAt: new Date().toISOString(),
      },
      [`خطا: ${msg}`]
    );
    await logSystemEvent("UPDATE_APPLY_FAILED", { entity: "update", metadata: { version, error: msg.slice(0, 500) } }).catch(() => null);
  } finally {
    applying = false;
    // temp cleanup (the download zip is kept on error for inspection)
    await fsp.rm(EXTRACT_DIR, { recursive: true, force: true }).catch(() => null);
    if (readUpdateState().phase !== "error") {
      await fsp.rm(DOWNLOAD_FILE, { force: true }).catch(() => null);
    }
  }
}

/* ── download (streamed, 120s timeout, 200MB cap, live progress) ── */

async function downloadZip(zipUrl: string): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(zipUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": "TAJ-Electronics-Updater/1.0" },
    });
    if (!res.ok || !res.body) throw new Error(`دانلود فایل به‌روزرسانی ناموفق بود (کد ${res.status})`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_ZIP_BYTES) throw new Error("حجم فایل به‌روزرسانی بیش از ۲۰۰ مگابایت است");

    let received = 0;
    let lastEmit = 0;
    const total = declared > 0 ? declared : 0;
    const meter = new Transform({
      transform(chunk: Buffer, _enc: string, cb: (err?: Error | null, data?: Buffer) => void) {
        received += chunk.length;
        if (received > MAX_ZIP_BYTES) {
          cb(new Error("حجم فایل به‌روزرسانی بیش از ۲۰۰ مگابایت است"));
          return;
        }
        const now = Date.now();
        if (now - lastEmit > 400) {
          lastEmit = now;
          const percent = total > 0 ? 4 + Math.floor(36 * (received / total)) : 10;
          const human = total > 0 ? `${(received / 1048576).toFixed(1)}/${(total / 1048576).toFixed(1)}MB` : `${(received / 1048576).toFixed(1)}MB`;
          writeUpdateState({ percent, message: `در حال دانلود فایل به‌روزرسانی… ${human}` });
        }
        cb(null, chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(res.body as unknown as import("stream/web").ReadableStream<Uint8Array>),
      meter,
      createWriteStream(DOWNLOAD_FILE)
    );
    return received;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === "AbortError" || /aborted/i.test(err.message)) {
      throw new Error("دانلود بیش از ۱۲۰ ثانیه طول کشید — دوباره تلاش کنید");
    }
    if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(err.message)) {
      throw new Error("دانلود فایل به‌روزرسانی ناموفق بود — سرور فایل در دسترس نیست");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ── migrate: additive prisma db push (non-fatal, output captured) ──
 * Tries THREE launch methods because the runtime differs by deployment:
 *   1. bunx prisma                 — dev / bun-capable hosts (sandbox)
 *   2. node_modules/prisma CLI     — the production Docker image ships the
 *      (node node_modules/...)       prisma CLI closure but has NO bun/bunx
 *   3. npx prisma                 — hosts with npm on PATH
 */

function spawnMigrate(command: string, args: string[]) {
  try {
    return spawn(command, args, { cwd: APP_ROOT, env: process.env });
  } catch {
    return null;
  }
}

function prismaCliEntry(): string | null {
  for (const cand of [
    path.join(APP_ROOT, "node_modules", "prisma", "build", "index.js"),
    path.join(APP_ROOT, "node_modules", ".bin", "prisma"),
  ]) {
    try {
      if (existsSync(cand)) return cand;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function runMigrate(): Promise<string> {
  const attempts: { label: string; command: string; args: string[] }[] = [
    { label: "bunx prisma db push", command: "bunx", args: ["prisma", "db", "push", "--skip-generate"] },
  ];
  const cli = prismaCliEntry();
  if (cli && cli.endsWith("index.js")) {
    attempts.push({
      label: "node prisma-CLI db push",
      command: "node",
      args: [cli, "db", "push", "--skip-generate"],
    });
  }
  attempts.push({ label: "npx prisma db push", command: "npx", args: ["prisma", "db", "push", "--skip-generate"] });

  const failures: string[] = [];
  for (const attempt of attempts) {
    const out = await new Promise<string>((resolve) => {
      const proc = spawnMigrate(attempt.command, attempt.args);
      if (!proc) {
        resolve("اجرا نشد: spawn ناموفق بود");
        return;
      }
      let buf = "";
      const timer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          /* already dead */
        }
      }, MIGRATE_TIMEOUT_MS);
      proc.stdout?.on("data", (d) => (buf += String(d)));
      proc.stderr?.on("data", (d) => (buf += String(d)));
      proc.on("error", (e) => {
        clearTimeout(timer);
        resolve(`اجرا نشد: ${e.message}`);
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        resolve(`کد خروج ${code ?? "?"}\n${buf.trim().slice(0, 2000)}`);
      });
    });
    if (/^کد خروج 0(\s|$|\n)/.test(out.trim())) {
      return `[${attempt.label}] ${out}`;
    }
    failures.push(`[${attempt.label}] ${out.replace(/\s+/g, " ").slice(0, 200)}`);
  }
  return `prisma db push در این محیط در دسترس نبود (به داده‌ها دست زده نشده است) — ${failures.join(" | ")}`;
}
