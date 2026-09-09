/**
 * v28: client-side image compression before upload.
 *
 * WHY: many hosting stacks (nginx `client_max_body_size`, PaaS gateways,
 * preview proxies) reject request bodies over ~1MB with a 413 that never
 * reaches the app — the admin then sees «بارگذاری تصویر ناموفق بود» for
 * every real camera photo while small test images work. Compressing in the
 * browser FIRST makes every upload small enough to pass ANY proxy, uploads
 * faster on mobile networks, and matches the server's own 1600px cap.
 *
 * Behavior:
 *  - files ≤ 900KB are uploaded untouched (already proxy-safe)
 *  - GIFs are uploaded untouched (compression would kill the animation)
 *  - undecodable formats (e.g. HEIC) are returned as-is → the server
 *    answers with the precise format error
 *  - everything else is decoded, capped at 1600px and re-encoded:
 *      JPEG → JPEG 0.85 · opaque PNG → JPEG 0.9 · PNG with alpha → PNG ·
 *      WebP → WebP 0.85
 *  - if the compressed blob is NOT smaller than the original, the original
 *    is uploaded instead (never make things worse)
 *  - any failure returns the original file (the server still validates)
 */

const SKIP_BELOW = 900 * 1024; // 900KB — already safe for restrictive proxies
const MAX_DIM = 1600; // same cap the server applies via sharp

export async function compressImageForUpload(file: File): Promise<File> {
  try {
    if (file.size <= SKIP_BELOW) return file;
    if (file.type === "image/gif") return file; // animation must survive

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // detect transparency for PNGs (JPEG would fill alpha with black)
    let hasAlpha = false;
    if (file.type === "image/png") {
      try {
        const data = ctx.getImageData(0, 0, w, h).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }
      } catch {
        hasAlpha = true; // assume safe
      }
    }

    let mime: string;
    let quality: number;
    switch (true) {
      case file.type === "image/png" && hasAlpha:
        mime = "image/png"; // keep transparency (logos/graphics)
        quality = 0.92;
        break;
      case file.type === "image/webp":
        mime = "image/webp";
        quality = 0.85;
        break;
      default: // jpeg input, opaque png, avif…
        mime = "image/jpeg";
        quality = 0.87;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: mime });
  } catch {
    return file; // never block the upload path
  }
}
