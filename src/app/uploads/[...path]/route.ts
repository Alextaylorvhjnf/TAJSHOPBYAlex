import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * /uploads/[...path] — runtime media server (v14.1 critical fix).
 *
 * WHY THIS EXISTS: the Next.js standalone production server caches the
 * `public/` directory file list AT STARTUP. Files written at runtime
 * (admin uploads → public/uploads/…) are silently 404'd by the static
 * handler even though they exist on disk — the exact bug reported as
 * "uploaded image preview does not show" on the production VPS.
 *
 * This catch-all route serves `public/uploads/**` straight from the
 * filesystem on every request, so runtime uploads work everywhere
 * (dev, standalone, Docker volume). URL shape is unchanged — all
 * existing DB-stored /uploads/... URLs keep working (data preservation).
 *
 * Security:
 * - path traversal blocked (segments validated: no "..", no absolute)
 * - only whitelisted extensions
 * - only GET/HEAD
 * Caching: filenames are random (anti-collision) → immutable, 1 year.
 * Range requests are supported so story videos can seek (Safari requires it).
 */

const ALLOWED_EXT = new Set([
  ".webp", ".png", ".jpg", ".jpeg", ".avif", ".gif",
  ".mp4", ".webm", ".mov",
]);

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

function safeJoinUploadPath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const seg of segments) {
    if (!seg || seg === "." || seg === ".." || seg.includes("/") || seg.includes("\\") || seg.includes("\0")) {
      return null;
    }
  }
  const base = path.resolve(process.cwd(), "public", "uploads");
  const abs = path.resolve(process.cwd(), "public", "uploads", ...segments);
  if (!abs.startsWith(base + path.sep)) return null; // double guard vs traversal
  return abs;
}

function toWebStream(nodePath: string, start?: number, end?: number): ReadableStream<Uint8Array> {
  const stream = createReadStream(nodePath, start !== undefined ? { start, end } : undefined);
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  const abs = safeJoinUploadPath(segments);
  if (!abs) return new NextResponse("Bad request", { status: 400 });

  const ext = path.extname(abs).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return new NextResponse("Not found", { status: 404 });

  let size: number;
  try {
    const st = statSync(abs);
    if (!st.isFile()) return new NextResponse("Not found", { status: 404 });
    size = st.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const type = MIME[ext] ?? "application/octet-stream";
  const immutable = "public, max-age=31536000, immutable"; // random filenames → never change

  // Range support (video seeking / Safari)
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
      if (start <= end && start < size) {
        return new NextResponse(toWebStream(abs, start, end), {
          status: 206,
          headers: {
            "Content-Type": type,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": immutable,
          },
        });
      }
    }
    return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  return new NextResponse(toWebStream(abs), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": immutable,
    },
  });
}

export async function HEAD(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const res = await GET(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
