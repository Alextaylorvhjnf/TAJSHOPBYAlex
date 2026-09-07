import { db } from "@/lib/db";

export async function logAdmin(
  adminId: string,
  action: string,
  opts: { entity?: string; entityId?: string; metadata?: unknown; ip?: string } = {}
) {
  try {
    await db.adminLog.create({
      data: {
        adminId,
        action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: opts.metadata ? JSON.stringify(opts.metadata).slice(0, 2000) : null,
        ip: opts.ip,
      },
    });
  } catch {
    /* audit log must never break the request */
  }
}

/**
 * v20: SYSTEM-level event log — for errors/diagnostics that happen with NO
 * acting admin in the request (e.g. the public AI chat widget hitting a
 * broken LLM engine). The entry is attributed to the newest super-admin (or
 * fallback admin) so it surfaces in the admin activity log feed exactly like
 * a manual action — "analyze the whole errors and say it to the admin in
 * the log field" (v20 user request).
 */
export async function logSystemEvent(
  action: string,
  opts: { entity?: string; entityId?: string; metadata?: unknown; ip?: string } = {}
) {
  try {
    const superAdmin = await db.user.findFirst({
      where: { role: "SUPER_ADMIN", isBlocked: false },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const fallbackAdmin = superAdmin ?? (await db.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isBlocked: false },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }));
    if (!fallbackAdmin) return; // no admin exists yet (pre-install) — nothing to surface
    await logAdmin(fallbackAdmin.id, action, opts);
  } catch {
    /* system log must never break the request */
  }
}
