import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import {
  getCurrentVersion,
  isNewerVersion,
  compareVersions,
  resolveManifestSetting,
  fetchManifest,
  beginUpdate,
  type UpdateManifest,
} from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/update/apply — SUPER_ADMIN only.
 * Body: { version, zipUrl, sha256? }. The manifest is RE-FETCHED and the
 * requested version/zipUrl must match its latest entry (no stale or
 * arbitrary zips). The heavy work then continues in the background —
 * progress is polled from /api/admin/update/status.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  const ip = getClientIp(req);

  if (admin.role !== "SUPER_ADMIN") {
    await logAdmin(admin.id, "UPDATE_APPLY_DENIED", {
      entity: "update",
      ip,
      metadata: { role: admin.role },
    });
    return fail("فقط مدیر ارشد (SUPER_ADMIN) می‌تواند به‌روزرسانی را اجرا کند", 403);
  }

  const body = (await req.json().catch(() => null)) as
    | { version?: unknown; zipUrl?: unknown; sha256?: unknown }
    | null;
  const version = typeof body?.version === "string" ? body.version.trim() : "";
  const zipUrl = typeof body?.zipUrl === "string" ? body.zipUrl.trim() : "";
  const sha256 =
    typeof body?.sha256 === "string" && /^[a-fA-F0-9]{64}$/.test(body.sha256) ? body.sha256.toLowerCase() : null;
  if (!version || !zipUrl) {
    return fail("نسخه یا آدرس فایل به‌روزرسانی مشخص نیست — ابتدا «بررسی به‌روزرسانی» را اجرا کنید", 400);
  }

  const current = getCurrentVersion();
  const origin = new URL(req.url).origin;

  // re-fetch the manifest — the requested version must be its current latest
  let manifest: UpdateManifest;
  try {
    const { raw } = await resolveManifestSetting();
    manifest = await fetchManifest(raw, origin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته";
    return fail(`مانیفست در دسترس نیست — ${msg}`, 502);
  }
  if (manifest.version !== version || (manifest.zipUrl ?? "") !== zipUrl) {
    return fail("نسخهٔ درخواستی با آخرین نسخهٔ مانیفست مطابقت ندارد — صفحه را رفرش کنید و دوباره بررسی کنید", 409);
  }
  if (!isNewerVersion(version, current)) {
    return fail("این نسخه جدیدتر از نسخهٔ فعلی نیست — به‌روزرسانی لازم نیست", 400);
  }
  if (manifest.minAppVersion && compareVersions(current, manifest.minAppVersion) < 0) {
    return fail(`برای نصب این نسخه ابتدا باید نسخهٔ فعلی به ${manifest.minAppVersion} ارتقا یابد`, 400);
  }

  const started = await beginUpdate({
    version,
    zipUrl,
    sha256: manifest.sha256 ?? sha256, // manifest wins; body is the fallback
    origin,
  });
  if (!started.started) {
    return fail(started.reason ?? "یک فرآیند به‌روزرسانی هم‌اکنون در حال اجراست", 409);
  }

  await logAdmin(admin.id, "UPDATE_APPLY_START", {
    entity: "update",
    entityId: version,
    ip,
    metadata: { zipUrl },
  });
  return ok({ started: true, version, message: "فرآیند به‌روزرسانی آغاز شد — پیشرفت را از همین پنل دنبال کنید" });
}
