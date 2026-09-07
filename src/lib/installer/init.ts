import { access, constants, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/settings";

/**
 * Real initialization operations performed by the final install step.
 * All operations are idempotent and non-destructive (create-if-missing only).
 */

/** Create the singleton settings rows (store/payment/AI) if missing. */
export async function initSettings(): Promise<{ created: string[] }> {
  const created: string[] = [];

  if (!(await db.storeSettings.findUnique({ where: { id: "main" } }))) {
    await db.storeSettings.create({ data: { id: "main" } });
    created.push("StoreSettings");
  }
  if (!(await db.paymentSettings.findUnique({ where: { id: "main" } }))) {
    await db.paymentSettings.create({ data: { id: "main" } });
    created.push("PaymentSettings");
  }
  if (!(await db.aiSettings.findUnique({ where: { id: "main" } }))) {
    await db.aiSettings.create({ data: { id: "main" } });
    created.push("AiSettings");
  }
  if (!(await db.smtpSettings.findUnique({ where: { id: "main" } }))) {
    await db.smtpSettings.create({ data: { id: "main" } });
    created.push("SmtpSettings");
  }

  invalidateSettingsCache();
  return { created };
}

const UPLOAD_DIRS = ["products", "sliders", "brands", "receipts", "avatars", "misc"];

/** Ensure storage directories exist and are writable (real probe). */
export async function initStorage(): Promise<{ dirs: string[]; writable: boolean }> {
  const root = path.join(process.cwd(), "public", "uploads");
  const dirs: string[] = [];
  for (const d of UPLOAD_DIRS) {
    const p = path.join(root, d);
    await mkdir(p, { recursive: true });
    try {
      await access(p, constants.W_OK);
      dirs.push(p);
    } catch {
      return { dirs, writable: false };
    }
  }
  return { dirs, writable: true };
}
