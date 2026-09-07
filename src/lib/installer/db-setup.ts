import { spawn } from "child_process";
import { access } from "fs/promises";
import path from "path";

/**
 * Runs the project's EXISTING migration system (prisma db push) as a subprocess.
 *
 * Non-destructive by design (§19): `--accept-data-loss` is NEVER passed —
 * if the target database has drifted incompatibly, Prisma refuses to proceed
 * and the error is surfaced to the user instead of destroying data.
 *
 * Binary resolution order:
 *   1. node_modules/.bin/prisma (dev + Docker w/ prisma copied)
 *   2. node <node_modules/prisma/build/index.js> (same, without .bin)
 *   3. bunx prisma (fallback)
 */
export type DbPushResult = { ok: boolean; message: string; log: string[] };

const PRISMA_BIN = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const PRISMA_JS = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function runDbPush(): Promise<DbPushResult> {
  let cmd: string;
  let args: string[];

  if (await exists(PRISMA_BIN)) {
    cmd = PRISMA_BIN;
    args = ["db", "push", "--skip-generate"];
  } else if (await exists(PRISMA_JS)) {
    cmd = process.execPath;
    args = [PRISMA_JS, "db", "push", "--skip-generate"];
  } else {
    cmd = "bunx";
    args = ["prisma", "db", "push", "--skip-generate"];
  }

  return new Promise((resolve) => {
    const log: string[] = [];
    let settled = false;
    const finish = (r: DbPushResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(r);
      }
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cmd, args, {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      return resolve({
        ok: false,
        message: "اجرای ابزار مایگریشن ممکن نشد — لطفاً با پشتیبانی تماس بگیرید",
        log,
      });
    }

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* noop */
      }
      finish({
        ok: false,
        message: "اجرای مایگریشن بیش از حد طول کشید — لطفاً دوباره تلاش کنید",
        log,
      });
    }, 180_000);

    const push = (d: Buffer) => {
      for (const line of d.toString().split("\n")) {
        const t = line.trim();
        if (t) log.push(t);
      }
      if (log.length > 400) log.splice(0, log.length - 400);
    };
    child.stdout?.on("data", push);
    child.stderr?.on("data", push);

    child.on("error", () =>
      finish({
        ok: false,
        message: "ابزار Prisma اجرا نشد — وابستگی‌های برنامه را بررسی کنید",
        log,
      })
    );

    child.on("close", (code) => {
      if (code === 0) {
        finish({
          ok: true,
          message: "ساختار دیتابیس با موفقیت ایجاد و همگام‌سازی شد",
          log,
        });
      } else {
        // surface a friendly, non-technical reason; raw log stays in the wizard log view (no secrets)
        const hasDrift = log.some((l) => /data loss|destructive|warn/i.test(l));
        finish({
          ok: false,
          message: hasDrift
            ? "به دلیل تغییرات ناسازگار با داده‌های موجود، اجرای غیرمخرب متوقف شد — داده‌های شما حفظ شده‌اند"
            : "ایجاد ساختار دیتابیس ناموفق بود — جزئیات در گزارش زیر",
          log,
        });
      }
    });
  });
}
