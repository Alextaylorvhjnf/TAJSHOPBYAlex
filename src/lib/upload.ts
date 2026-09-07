import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Every folder the upload API accepts (images) + "videos" for story videos. */
export const UPLOAD_FOLDERS = [
  "products",
  "sliders",
  "brands",
  "stories",
  "showcases",
  "cms",
  "branding",
  "avatars",
  "misc",
  "receipts",
  "tickets",
  // v27.1: category photos (admin → دسته‌بندی‌ها → عکس دسته‌بندی)
  "categories",
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export type UploadResult =
  | { ok: true; url: string; width?: number; height?: number }
  | { ok: false; message: string };

/**
 * Secure image upload: validates MIME + size, randomizes filename,
 * optimizes to WebP via sharp (when available), stores under public/uploads.
 */
export async function saveImageUpload(file: File, folder: UploadFolder): Promise<UploadResult> {
  if (!file || typeof file === "string") return { ok: false, message: "فایلی ارسال نشده است" };
  const ext = ALLOWED.get(file.type);
  if (!ext) return { ok: false, message: "فرمت تصویر مجاز نیست (JPG, PNG, WebP, AVIF, GIF)" };
  if (file.size > MAX_SIZE) return { ok: false, message: "حجم تصویر باید حداکثر ۵ مگابایت باشد" };
  if (file.size < 100) return { ok: false, message: "فایل تصویر نامعتبر است" };

  const bytes = Buffer.from(await file.arrayBuffer());
  // magic-number sniffing — determine the REAL image type (defeat spoofed/wrong MIME)
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isGif = bytes.subarray(0, 3).toString("ascii") === "GIF";
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const isAvif = bytes.subarray(4, 8).toString("ascii") === "ftyp";
  let realExt: string | null = null;
  if (isJpeg) realExt = "jpg";
  else if (isPng) realExt = "png";
  else if (isGif) realExt = "gif";
  else if (isWebp) realExt = "webp";
  else if (isAvif) realExt = "avif";
  if (!realExt) {
    // fall back to declared MIME only if extension was allowed and file is not empty
    if (!ext) return { ok: false, message: "محتوای فایل یک تصویر معتبر نیست" };
    realExt = ext;
  }

  const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  // Optimize with sharp → WebP (fallback to original bytes on failure).
  // NOTE: favicon/branding PNGs must stay PNG (browser tab icons) — sharp keeps
  // PNG for them via the preserveOriginal flag below.
  const preserveOriginal = folder === "branding";
  let finalBuffer: Buffer = bytes;
  let finalExt = realExt;
  if (!preserveOriginal) {
    try {
      const sharp = (await import("sharp")).default;
      const image = sharp(bytes).rotate();
      const meta = await image.metadata();
      if (meta.width && meta.width > 1600) {
        finalBuffer = await image.resize({ width: 1600 }).webp({ quality: 82 }).toBuffer();
      } else {
        finalBuffer = await image.webp({ quality: 82 }).toBuffer();
      }
      finalExt = "webp";
    } catch {
      /* keep original buffer */
    }
  }

  const filename = `${name}.${finalExt}`;
  await writeFile(path.join(dir, filename), finalBuffer);
  return { ok: true, url: `/uploads/${folder}/${filename}` };
}

/* ──────────────────────────────────────────────────────────────
 * Video uploads (story videos — spec §10 "video در صورت پشتیبانی")
 * ────────────────────────────────────────────────────────────── */

const VIDEO_ALLOWED = new Map<string, string>([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["video/ogg", "ogv"],
]);

const VIDEO_MAX_SIZE = 64 * 1024 * 1024; // 64MB — story clips are short

/** Magic-number sniffing for real video containers (defeats spoofed MIME). */
function sniffVideo(bytes: Buffer): string | null {
  // MP4/MOV: bytes 4..8 == "ftyp"
  if (bytes.length > 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("ascii").toLowerCase();
    if (brand.startsWith("qt")) return "mov";
    return "mp4";
  }
  // WebM/MKV: 0x1A45DFA3 EBML header
  if (bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm";
  // OGG: "OggS"
  if (bytes.subarray(0, 4).toString("ascii") === "OggS") return "ogv";
  return null;
}

/**
 * Secure video upload: validates MIME + size, sniffs the real container
 * type, randomizes the filename, stores under public/uploads/<folder>.
 * No re-encode (no ffmpeg dependency) — stored as-is.
 * v16: `folder` defaults to "videos" (story clips); ticket attachments pass
 * "tickets" so their URLs match ticketAttachmentSchema (/uploads/tickets/…).
 */
export async function saveVideoUpload(file: File, folder: string = "videos"): Promise<UploadResult> {
  if (!file || typeof file === "string") return { ok: false, message: "فایلی ارسال نشده است" };
  const declared = VIDEO_ALLOWED.get(file.type);
  if (!declared) return { ok: false, message: "فرمت ویدیو مجاز نیست (MP4, WebM, MOV)" };
  if (file.size > VIDEO_MAX_SIZE) return { ok: false, message: "حجم ویدیو باید حداکثر ۶۴ مگابایت باشد" };
  if (file.size < 1024) return { ok: false, message: "فایل ویدیو نامعتبر است" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const realExt = sniffVideo(bytes) ?? declared;

  const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const filename = `${name}.${realExt}`;
  await writeFile(path.join(dir, filename), bytes);
  return { ok: true, url: `/uploads/${folder}/${filename}` };
}
