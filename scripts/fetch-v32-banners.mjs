#!/usr/bin/env bun
/* ═══════════════════════════════════════════════════════════════════
 *  v32 banners v2 (run by main): fetch OFFICIAL manufacturer/retailer
 *  press photography from Bing Images — domain-whitelisted (apple.com,
 *  bestbuy, walmart, samsung, sony, lg, hp, dell, asus, msi, emag…)
 *  so the content is guaranteed professional product photography —
 *  then normalize each to a uniform 1600×900 (16:9) hero with sharp.
 *  Idempotent. RUN: bun scripts/fetch-v32-banners.mjs
 * ═══════════════════════════════════════════════════════════════════ */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const sharp = (await import("sharp")).default;

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "images", "sliders");
fs.mkdirSync(OUT, { recursive: true });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/* trusted press/retailer CDNs — official product photography */
const TRUSTED = [
  "apple.com", "mzstatic.com", "cdsassets.apple.com", "bestbuy", "bbystatic", "walmartimages", "walmart.com",
  "media-amazon.com", "images.amazon", "ssl-images-amazon", "images.samsung.com", " samsung.com", "sony.net", "sony.com", "sonyworld", "lg.com", "lge.com",
  "hp.com", "dell.com", "dellcdn", "asus.com", "msi.com", "emag", "techinn", " Xiaomi",
  "mi.com", "hwcdn", "lenovo.com", "lenovo", "razer.com", "razerzone", "logitech.com",
  "logitechg", "jbl.com", "harman", "bose.com", "sennheiser.com", "anker.com", "se.com",
  "playstation.com", "xbox.com", "nintendo.com", "notebookcheck", "popsci.com",
];

const BANNERS = [
  { file: "v32-phone", q: "iPhone 15 Pro titanium press image apple newsroom" },
  { file: "v32-laptop", q: "MacBook Pro product press image apple" },
  { file: "v32-gaming", q: "PS5 slim walmart image" },
  { file: "v32-audio", q: "Sony WH-1000XM5 photo" },
  { file: "v32-fest", q: "iPad Air amazon product image" },
];

async function bing(query) {
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=25`;
  try {
    const { stdout } = await execFileAsync("curl", ["-s", "--max-time", "30", "-A", UA, "-H", "Accept-Language: en-US", url], { timeout: 40_000, maxBuffer: 24 * 1024 * 1024 });
    const out = [];
    const re = /murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g;
    let m;
    while ((m = re.exec(stdout)) !== null) out.push(m[1]);
    return [...new Set(out)];
  } catch { return []; }
}

function trusted(u) {
  const host = u.toLowerCase();
  return TRUSTED.some((d) => host.includes(d.trim().toLowerCase()));
}

async function toBanner(srcUrl, dest) {
  const tmp = dest + ".tmp";
  try {
    await execFileAsync("curl", ["-sL", "--max-time", "90", "-A", UA, "-o", tmp, srcUrl], { timeout: 100_000 });
    const buf = fs.readFileSync(tmp);
    if (buf.length < 40 * 1024 || buf.length > 12 * 1024 * 1024) return false;
    const meta = await sharp(buf).metadata();
    if ((meta.width ?? 0) < 900) return false;
    await sharp(buf)
      .resize(1600, 900, { fit: "cover", position: "attention" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(dest);
    return true;
  } catch {
    return false;
  } finally {
    try { if (fs.existsSync(tmp)) fs.rmSync(tmp); } catch { /* ignore */ }
  }
}

/* nuke the untrusted v1 results */
for (const b of BANNERS) {
  const dest = path.join(OUT, `${b.file}.jpg`);
  try { if (fs.existsSync(dest)) fs.rmSync(dest); } catch { /* ignore */ }
}

for (const b of BANNERS) {
  const dest = path.join(OUT, `${b.file}.jpg`);
  const urls = (await bing(b.q)).filter(trusted);
  if (urls.length === 0) { console.log(`✗ ${b.file}: no trusted candidate`); continue; }
  let done = false;
  for (const u of urls.slice(0, 8)) {
    if (await toBanner(u, dest)) { console.log(`✓ ${b.file}.jpg ← ${u.slice(0, 80)}`); done = true; break; }
  }
  if (!done) console.log(`✗ ${b.file}: trusted candidates failed to convert (${urls.length})`);
}
console.log("banners v2 done.");
