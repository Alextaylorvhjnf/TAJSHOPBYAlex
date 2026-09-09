import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import {
  getCurrentVersion,
  isNewerVersion,
  resolveManifestSetting,
  fetchManifest,
} from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────
 * v31 · AUTO-POLL (Task 5-b) — GET /api/admin/update/poll
 * ────────────────────────────────────────────────────────────────────────
 * Background endpoint the admin panel calls while it is open (every 5 min
 * from the update tab, every 10 min from the shell). It re-uses /check's
 * manifest resolution + version comparison but throttles the REAL remote
 * fetch to at most once per 10 minutes (module-level cache, so any number
 * of admin browsers share one GitHub request). When a newer version is
 * observed it creates a SYSTEM Notification for every ADMIN/SUPER_ADMIN
 * (deduped per user against UNREAD notifications of the same version), so
 * the release surfaces through the bell without anyone opening the update
 * tab. Failures never 500: the last-known state is returned with `error`.
 * ──────────────────────────────────────────────────────────────────────── */

/** a REAL remote manifest fetch is allowed at most this often */
const REAL_FETCH_EVERY_MS = 10 * 60_000;
/** poll fetches use a shorter budget than the manual /check (15s) */
const POLL_MANIFEST_TIMEOUT_MS = 10_000;
/** notification title — the version string is part of the dedupe key */
const notifyTitle = (version: string) => `آپدیت جدید اسکریپت (نسخهٔ ${version})`;

interface PollSnapshot {
  current: string;             // app version at real-fetch time
  latest: string | null;       // last-known manifest version (null = never fetched ok)
  hasUpdate: boolean;          // latest > current (evaluated at fetch time)
  lastCheckedAt: string | null; // ISO of the last SUCCESSFUL real fetch
  error: string | null;        // Persian error of the last attempt (null = ok)
  notifiedFor: string | null;  // manifest version notifications were created for
  fetchedAt: number;           // epoch ms of the last real-fetch ATTEMPT (ok or failed)
}

let snapshot: PollSnapshot | null = null;
let inFlight: Promise<PollSnapshot> | null = null;

/**
 * Create the update notification for every active ADMIN/SUPER_ADMIN.
 * v32 (Task 13-a) · message is EXACTLY «آپدیت جدید اسکریپت موجود است،
 * می‌توانید آپدیت کنید» with the version in parentheses; the link opens
 * the update tab. Dedupe: a user is skipped when they already have an
 * UNREAD SYSTEM notification whose title contains this version string.
 * @returns number of notifications actually created.
 */
async function notifyAdminsAboutUpdate(version: string): Promise<number> {
  let admins: { id: string }[];
  try {
    admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isBlocked: false },
      select: { id: true },
    });
  } catch {
    return 0; // db unavailable (pre-install) — poll still answers fine
  }

  const message = `آپدیت جدید اسکریپت موجود است، می‌توانید آپدیت کنید (نسخهٔ ${version})`;

  let created = 0;
  for (const admin of admins) {
    try {
      const dup = await db.notification.findFirst({
        where: {
          userId: admin.id,
          type: "SYSTEM",
          isRead: false,
          title: { contains: version },
        },
        select: { id: true },
      });
      if (dup) continue; // already has an unread notification for this version
      await db.notification.create({
        data: {
          userId: admin.id,
          title: notifyTitle(version),
          message,
          type: "SYSTEM",
          link: "/admin/settings?tab=update",
        },
      });
      created++;
    } catch {
      /* one failed user must not abort the rest */
    }
  }
  return created;
}

/** The real (throttled) work: resolve the HARDCODED manifest URL (the
 * owner's official GitHub repo — v32/Task 13-a), fetch it, compare versions
 * and — on a new version — notify the admins. Never throws; failures produce a
 * snapshot that keeps the last-known state plus a Persian error. */
async function realFetch(origin: string): Promise<PollSnapshot> {
  const fetchedAt = Date.now();
  const current = getCurrentVersion();
  const prev = snapshot;
  try {
    const { raw } = await resolveManifestSetting();
    const manifest = await fetchManifest(raw, origin, POLL_MANIFEST_TIMEOUT_MS);
    const hasUpdate = isNewerVersion(manifest.version, current);
    const snap: PollSnapshot = {
      current,
      latest: manifest.version,
      hasUpdate,
      lastCheckedAt: new Date(fetchedAt).toISOString(),
      error: null,
      notifiedFor: prev?.notifiedFor ?? null,
      fetchedAt,
    };
    if (hasUpdate && snap.notifiedFor !== manifest.version) {
      await notifyAdminsAboutUpdate(manifest.version);
      snap.notifiedFor = manifest.version;
    }
    return snap;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته";
    // keep the last-known latest/hasUpdate so the panel doesn't flap on
    // a transient network blip; re-evaluate against the live current
    // version (an update may have been applied meanwhile)
    const latest = prev?.latest ?? null;
    return {
      current,
      latest,
      hasUpdate: !!latest && isNewerVersion(latest, current),
      lastCheckedAt: prev?.lastCheckedAt ?? null,
      error: `بررسی خودکار ناموفق بود — ${msg}`,
      notifiedFor: prev?.notifiedFor ?? null,
      fetchedAt, // failures count as an attempt → still throttled
    };
  }
}

/** GET — any admin role (same guard as the other /api/admin/update/* routes). */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const now = Date.now();
  if (!snapshot || now - snapshot.fetchedAt >= REAL_FETCH_EVERY_MS) {
    // share a single in-flight fetch between concurrent pollers
    if (!inFlight) {
      inFlight = realFetch(new URL(req.url).origin).finally(() => {
        inFlight = null;
      });
    }
    snapshot = await inFlight;
  }

  // re-evaluate against the LIVE current version (a panel-applied update
  // rewrites package.json immediately — hasUpdate must flip off at once)
  const current = getCurrentVersion();
  const latest = snapshot.latest;
  const hasUpdate = !!latest && isNewerVersion(latest, current);
  if (snapshot.current !== current || snapshot.hasUpdate !== hasUpdate) {
    snapshot = { ...snapshot, current, hasUpdate };
  }

  return ok(
    {
      current,
      latest,
      hasUpdate,
      lastCheckedAt: snapshot.lastCheckedAt,
      ...(snapshot.error ? { error: snapshot.error } : {}),
    },
    200,
    { noStore: true }
  );
}
