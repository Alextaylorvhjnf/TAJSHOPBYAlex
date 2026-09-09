#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────────────
 * scripts/release-update.mjs — maintainer release tool (v34)
 * ────────────────────────────────────────────────────────────────────────
 * Builds + publishes a new app update to the store's GitHub repo
 * (https://github.com/Alextaylorvhjnf/TAJSHOPBYAlex).
 *
 * What it does, in order:
 *   1. syncs the dev source tree (default /home/z/my-project) into this
 *      repo working dir (src/, prisma/, scripts/, public/ minus uploads,
 *      root configs, docs, package.json, bun.lock, db/catalog-seed.db)
 *   2. regenerates public/update/update-manifest.json (offline fallback,
 *      pinned to the release version)
 *   3. builds updates/taj-electronics-update-<version>.zip with ONLY the
 *      allowlisted paths (src/, public/ minus uploads, prisma/, scripts/
 *      minus this file, package.json + 6 root configs — NO bun.lock so the
 *      zip stays panel-apply compatible with v29.2+ deployments; update.sh
 *      syncs the lockfile from the repo root separately)
 *   4. writes updates/update-manifest.json (version, zipUrl, sha256,
 *      notes, minAppVersion) and copies the current update.sh there
 *   5. prunes old update zips (keeps the newest 3) and commits + pushes
 *
 * Usage:
 *   node scripts/release-update.mjs --notes "توضیح تغییرات"
 *   optional: --source /path/to/dev-tree  --min-app 24.0.0  --no-push
 * Prereq: the repo remote is configured with push access (token URL).
 * ──────────────────────────────────────────────────────────────────────── */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const NOTES = flag("--notes");
const SOURCE = flag("--source") ?? "/home/z/my-project";
const MIN_APP = flag("--min-app") ?? "24.0.0";
const NO_PUSH = argv.includes("--no-push");
// v34: pre-built standalone runtime embedding (--runtime = full runtime/ incl.
// node_modules; --runtime-code = runtime-code/ without node_modules, for when
// the full runtime would push the zip over GitHub's 100MB raw-file limit)
const RUNTIME = flag("--runtime");
const RUNTIME_CODE = flag("--runtime-code");

const REPO_DIR = path.resolve(import.meta.dirname, "..");
const RAW_BASE = "https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main";
const UPDATES_DIR = path.join(REPO_DIR, "updates");

if (!NOTES) {
  console.error("✗ --notes \"توضیح تغییرات این نسخه\" الزامی است");
  process.exit(1);
}

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"], ...opts });

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n", "utf8");

/* ── 1 · sync dev tree → repo ─────────────────────────────────────────── */

console.log("▸ 1/5 · همگام‌سازی سورس توسعه با ریپوی گیت‌هاب…");
const rsync = (srcRel, destRel, extra = []) =>
  sh("rsync", ["-a", "--delete", ...extra, path.join(SOURCE, srcRel), path.join(REPO_DIR, destRel)], {});

rsync("src/", "src/");
rsync("prisma/", "prisma/");
rsync("scripts/", "scripts/", ["--exclude", "release-update.mjs"]);
rsync("public/", "public/", ["--exclude", "uploads", "--exclude", "downloads"]);
fs.copyFileSync(path.join(SOURCE, "db", "catalog-seed.db"), path.join(REPO_DIR, "db", "catalog-seed.db"));
for (const f of [
  "package.json",
  "bun.lock",
  "next.config.ts",
  "tailwind.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "components.json",
  "eslint.config.mjs",
  ".env.example",
  "DEPLOY.md",
  "UPDATE-GUIDE.md",
  "RELEASE-NOTES-v29.md",
]) {
  const from = path.join(SOURCE, f);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(REPO_DIR, f));
}

/* ── 2 · version + offline manifest ───────────────────────────────────── */

const VERSION = readJson(path.join(REPO_DIR, "package.json")).version ?? "0.0.0";
console.log(`▸ 2/5 · نسخهٔ انتشار: ${VERSION}`);
writeJson(path.join(REPO_DIR, "public", "update", "update-manifest.json"), {
  version: VERSION,
  releasedAt: new Date().toISOString(),
  notes: "نسخهٔ فعلی. منبع اصلی به‌روزرسانی گیت‌هاب رسمی اسکریپت است؛ این فایل فقط زمانی استفاده می‌شود که هیچ منبع دیگری (پنل / متغیر محیطی / گیت‌هاب) در دسترس نباشد.",
  zipUrl: "",
});

/* ── 3 · build the update zip (allowlisted paths only) ────────────────── */

console.log("▸ 3/5 · ساخت بستهٔ ZIP به‌روزرسانی…");
const require2 = createRequire(path.join(SOURCE, "package.json")); // adm-zip lives in the dev tree
const AdmZip = require2("adm-zip");

const STAGING = "/tmp/taj-update-staging";
fs.rmSync(STAGING, { recursive: true, force: true });
fs.mkdirSync(path.join(STAGING), { recursive: true });
sh("rsync", ["-a", path.join(REPO_DIR, "src") + "/", path.join(STAGING, "src") + "/"]);
sh("rsync", ["-a", path.join(REPO_DIR, "prisma") + "/", path.join(STAGING, "prisma") + "/"]);
sh("rsync", [
  "-a",
  "--exclude", "release-update.mjs",
  "--exclude", "dev-supervisor.sh", // sandbox-only (never ships)
  "--exclude", "dev-watchdog.sh", // sandbox-only (never ships)
  path.join(REPO_DIR, "scripts") + "/",
  path.join(STAGING, "scripts") + "/",
]);
sh("rsync", ["-a", "--exclude", "uploads", "--exclude", "downloads", path.join(REPO_DIR, "public") + "/", path.join(STAGING, "public") + "/"]);
for (const f of [
  "package.json",
  "next.config.ts",
  "tailwind.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "components.json",
  "eslint.config.mjs",
]) {
  fs.copyFileSync(path.join(REPO_DIR, f), path.join(STAGING, f));
}

/* ── v34: embed the pre-built standalone runtime (optional) ───────── */
if (RUNTIME || RUNTIME_CODE) {
  const src = path.resolve(RUNTIME ?? RUNTIME_CODE);
  if (!fs.existsSync(path.join(src, "server.js"))) {
    console.error("✗ مسیر runtime معتبر نیست (server.js پیدا نشد): " + src);
    process.exit(1);
  }
  const destName = RUNTIME ? "runtime" : "runtime-code";
  const dest = path.join(STAGING, destName);
  // code-only mode: node_modules stays in the installed runtime (deps
  // unchanged), and public/ + src/ are already carried by the update zip's
  // own source staging — excluding them keeps the zip under GitHub's 100MB
  // raw-file limit. update.sh overlays them onto the runtime separately.
  const excl = RUNTIME ? [] : ["--exclude", "node_modules", "--exclude", "public", "--exclude", "src"];
  console.log(`▸ v34: افزودن runtime از پیش ساخته‌شده (${destName}/)…`);
  sh("rsync", ["-a", ...excl, src + "/", dest + "/"], {});
  console.log(`  استقرارهای standalone بدون هیچ بیلدی روی سرور به‌روز می‌شوند`);
}

fs.mkdirSync(UPDATES_DIR, { recursive: true });
const ZIP_PATH = path.join(UPDATES_DIR, `taj-electronics-update-${VERSION}.zip`);
const zip = new AdmZip();
zip.addLocalFolder(STAGING);
zip.writeZip(ZIP_PATH);
const zipBytes = fs.statSync(ZIP_PATH).size;
console.log(`  ${ZIP_PATH} (${(zipBytes / 1048576).toFixed(2)}MB)`);

/* ── 4 · sha256 + manifest + update.sh copy ───────────────────────────── */

console.log("▸ 4/5 · نوشتن مانیفست و چک‌سام…");
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(ZIP_PATH)).digest("hex");
writeJson(path.join(UPDATES_DIR, "update-manifest.json"), {
  version: VERSION,
  releasedAt: new Date().toISOString(),
  notes: NOTES,
  zipUrl: `${RAW_BASE}/updates/taj-electronics-update-${VERSION}.zip`,
  sha256,
  minAppVersion: MIN_APP,
});
fs.copyFileSync(path.join(REPO_DIR, "update.sh"), path.join(UPDATES_DIR, "update.sh"));
fs.chmodSync(path.join(UPDATES_DIR, "update.sh"), 0o755);

// prune old zips — keep the newest 3 (the manifest of the latest release
// always points at the newest; older ones serve users on old versions)
const zips = fs
  .readdirSync(UPDATES_DIR)
  .filter((n) => /^taj-electronics-update-.*\.zip$/.test(n))
  .map((n) => ({ n, t: fs.statSync(path.join(UPDATES_DIR, n)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
for (const { n } of zips.slice(3)) {
  fs.rmSync(path.join(UPDATES_DIR, n));
  console.log(`  حذف بستهٔ قدیمی: ${n}`);
}

/* ── 5 · commit + push ────────────────────────────────────────────────── */

console.log("▸ 5/5 · کامیت و پوش به گیت‌هاب…");
sh("git", ["-C", REPO_DIR, "add", "-A"], {});
const status = execFileSync("git", ["-C", REPO_DIR, "status", "--porcelain"], { encoding: "utf8" });
if (!status.trim()) {
  console.log("✓ هیچ تغییری برای انتشار نبود (سورس و مانیفست یکسان هستند)");
  process.exit(0);
}
const shortNotes = NOTES.replace(/\s+/g, " ").slice(0, 72);
sh("git", ["-C", REPO_DIR, "commit", "-m", `release v${VERSION}: ${shortNotes}`], {});
if (!NO_PUSH) {
  sh("git", ["-C", REPO_DIR, "push", "origin", "HEAD:main"], {});
  console.log(`✓ نسخهٔ ${VERSION} منتشر شد — مانیفست: ${RAW_BASE}/updates/update-manifest.json`);
  console.log(`  ZIP: ${RAW_BASE}/updates/taj-electronics-update-${VERSION}.zip`);
  console.log(`  SHA-256: ${sha256}`);
  console.log("→ فروشگاه‌های نصب‌شده با «بررسی به‌روزرسانی» یا ./update.sh آن را دریافت می‌کنند");
} else {
  console.log(`✓ نسخهٔ ${VERSION} ساخته و کامیت شد (--no-push — خودت پوش کن)`);
}
