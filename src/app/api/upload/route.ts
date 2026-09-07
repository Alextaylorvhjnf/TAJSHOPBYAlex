import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";
import { saveImageUpload, saveVideoUpload, UPLOAD_FOLDERS } from "@/lib/upload";

/**
 * Admin media upload endpoint (POST /api/upload).
 *
 * Serves EVERY admin image need (spec §2): product images + gallery, slider
 * images, story images, brand logos, showcase images, CMS images, branding
 * (logo / footer logo / favicon), avatars and misc — plus story VIDEOS via
 * folder="videos" (spec §10).
 *
 * Security: admin session required, folder whitelist, MIME + magic-number
 * validation, size caps, collision-resistant random filenames, path traversal
 * impossible (folder never touches the filename; path built from whitelist).
 * Files land in public/uploads/* → served as static assets and persisted via
 * the taj_uploads Docker volume in production.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  // 30 uploads / minute / admin — generous but abuse-safe
  const rl = rateLimit(`upload:${admin.id}`, 30, 60_000);
  if (!rl.ok) return fail(`درخواست‌های بیش از حد مجاز — ${rl.retryAfter} ثانیه دیگر تلاش کنید`, 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("درخواست نامعتبر است", 400);
  }

  const file = form.get("file");
  const folder = String(form.get("folder") ?? "misc");

  if (!(file instanceof File)) return fail("فایلی ارسال نشده است", 400);

  // story videos take a dedicated path (no sharp, larger size cap)
  if (folder === "videos") {
    const result = await saveVideoUpload(file);
    if (!result.ok) return fail(result.message, 400);
    await logAdmin(admin.id, "UPLOAD_VIDEO", { entity: "Media", entityId: result.url, ip: getClientIp(req) });
    return ok({ url: result.url, kind: "video" });
  }

  // images — folder whitelist (UPLOAD_FOLDERS is the single source of truth)
  if (!(UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
    return fail("پوشه بارگذاری نامعتبر است", 400);
  }

  const result = await saveImageUpload(file, folder as (typeof UPLOAD_FOLDERS)[number]);
  if (!result.ok) return fail(result.message, 400);

  await logAdmin(admin.id, "UPLOAD_IMAGE", { entity: "Media", entityId: result.url, ip: getClientIp(req) });
  return ok({ url: result.url, kind: "image" });
}
