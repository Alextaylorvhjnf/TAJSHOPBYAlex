import { ok, fail } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getCurrentVersion,
  isNewerVersion,
  resolveManifestSetting,
  fetchManifest,
  toAbsoluteManifestUrl,
  isStandaloneRuntime,
} from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/update/check — any admin role.
 * Fetches the manifest (DB-configured URL → env → shipped demo) with a 15s
 * timeout and compares it to the package.json version.
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  if (!rateLimit(`update-check:${admin.id}`, 6, 300_000).ok) {
    return fail("بررسی‌های زیاد — لطفاً حدود ۵ دقیقه دیگر دوباره تلاش کنید", 429);
  }

  const current = getCurrentVersion();
  const origin = new URL(req.url).origin;
  try {
    const { raw, source } = await resolveManifestSetting();
    const manifest = await fetchManifest(raw, origin);
    return ok(
      {
        current,
        latest: manifest.version,
        available: isNewerVersion(manifest.version, current),
        notes: manifest.notes,
        zipUrl: manifest.zipUrl,
        sha256: manifest.sha256,
        manifestUrl: raw,
        manifestSource: source,
        resolvedUrl: toAbsoluteManifestUrl(raw, origin),
        releasedAt: manifest.releasedAt,
        minAppVersion: manifest.minAppVersion,
        // "source" = source-run (dev / bun) — full effect after panel apply;
        // "standalone" = prebuilt runtime (v34 full install / Docker) — since
        // 29.0.2 the panel apply swaps the compiled runtime itself (the zip
        // carries it), so the panel shows an informational note only.
        runtime: isStandaloneRuntime() ? "standalone" : "source",
      },
      200,
      { noStore: true }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته";
    return fail(`بررسی به‌روزرسانی ناموفق بود — ${msg}`, 502);
  }
}
