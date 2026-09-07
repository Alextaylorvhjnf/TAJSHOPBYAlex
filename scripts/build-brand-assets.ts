/**
 * Brand asset pipeline — derives favicon / PWA / apple-touch / header-mark / OG sizes
 * from the generated master emblem (public/brand/logo-master.png).
 * Run: bun scripts/build-brand-assets.ts
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const B = path.join(process.cwd(), "public", "brand");

async function run() {
  const master = path.join(B, "logo-master.png");
  if (!fs.existsSync(master)) throw new Error("logo-master.png not found");
  const src = sharp(master);

  // Slight inset crop of the master (emblems usually have outer padding)
  const inset = sharp(master).extract({
    left: 62, top: 62, width: 1024 - 124, height: 1024 - 124,
  });
  const insetBuf = await inset.png().toBuffer();

  const outs: [string, number, "png" | "webp"][] = [
    ["icon-512.png", 512, "png"],
    ["icon-192.png", 192, "png"],
    ["apple-touch-icon.png", 180, "png"],
    ["favicon-48.png", 48, "png"],
    ["favicon-32.png", 32, "png"],
    ["favicon-16.png", 16, "png"],
    ["logo-mark.webp", 256, "webp"],
    ["logo-mark.png", 256, "png"],
  ];

  for (const [name, size, fmt] of outs) {
    const pipeline = sharp(insetBuf).resize(size, size, { fit: "cover" });
    const out = path.join(B, name);
    if (fmt === "png") await pipeline.png({ compressionLevel: 9 }).toFile(out);
    else await pipeline.webp({ quality: 90 }).toFile(out);
    console.log("✓", name);
  }

  // OG image → 1200x630 center crop
  const og = path.join(B, "og-image.png");
  if (fs.existsSync(og)) {
    await sharp(og)
      .resize(1200, 630, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(B, "og-1200x630.png"));
    console.log("✓ og-1200x630.png");
  }

  // Wide header logo (mark only, transparent-ish bg preserved from master)
  await src.composite([]).png().toFile(path.join(B, "logo-master-backup.png")).catch(() => null);

  console.log("Done.");
}

run().catch((e) => { console.error(e); process.exit(1); });
