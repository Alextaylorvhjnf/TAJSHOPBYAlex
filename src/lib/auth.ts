import { db, ensureRuntimeSchema } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";

export const SESSION_COOKIE = "taj_session";
export const GUEST_CART_COOKIE = "taj_cart";
const SESSION_DAYS = 30;

export type Role = "CUSTOMER" | "SUPPORT" | "ORDER_MANAGER" | "PRODUCT_MANAGER" | "ADMIN" | "SUPER_ADMIN";

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "PRODUCT_MANAGER", "ORDER_MANAGER"];
export const PRODUCT_WRITE: Role[] = ["SUPER_ADMIN", "ADMIN", "PRODUCT_MANAGER"];
export const ORDER_WRITE: Role[] = ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER", "SUPPORT"];
export const SETTINGS_WRITE: Role[] = ["SUPER_ADMIN", "ADMIN"];

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string, ip?: string, ua?: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS);
  await db.session.create({ data: { token, userId, expiresAt, ip, userAgent: ua } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => null);
  }
  store.delete(SESSION_COOKIE);
}

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isBlocked: boolean;
  avatar: string | null;
  createdAt: Date;
  /** v29: SHA-256 hash of the one-time recovery phrase (null = none set) */
  recoveryCodeHash: string | null;
  /** v29.2: JSON array of granular permission keys (null = role defaults).
   *  getAuthUser returns the FULL user row (include: { user: true }) so the
   *  field flows through automatically. */
  adminPermissions: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  /* v29.1: session→user include selects every User column — on an upgraded
   * (v28) volume missing recoveryCodeHash this would P2022/500 every admin
   * API. The self-heal adds the column before the query (cached, free). */
  await ensureRuntimeSchema();
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.isBlocked) return null;
  return session.user;
}

export function isAdminUser(user: AuthUser | null): boolean {
  return !!user && ADMIN_ROLES.includes(user.role as Role);
}

export function userCan(user: AuthUser | null, roles: Role[]): boolean {
  return !!user && roles.includes(user.role as Role);
}

/** Returns admin user or null (caller must respond 401/403) */
export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getAuthUser();
  return isAdminUser(user) ? user : null;
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

// ─────────────────────── v29 · recovery phrase code ───────────────────────
//
// One-time RECOVERY PHRASE per account — shown exactly once (installer
// DoneStep or «تولید کد بازیابی» in the admin profile), stored only as a
// SHA-256 hash. If an admin ever forgets the password they can log in on
// /admin/login → «فراموشی رمز عبور» with this phrase and set a new one.

/** 96 memorable words (~6.6 bits each) for the phrase */
const RECOVERY_WORDS = [
  "amber", "falcon", "quartz", "river", "cedar", "lotus", "comet", "atlas",
  "orbit", "delta", "lunar", "solar", "cobalt", "copper", "silver", "garnet",
  "jasper", "opal", "topaz", "zircon", "maple", "olive", "palm", "pine",
  "tulip", "orchid", "clover", "saffron", "vanilla", "cocoa", "mint", "pepper",
  "coral", "pearl", "wave", "dune", "ridge", "summit", "canyon", "meadow",
  "harbor", "beacon", "compass", "anchor", "canvas", "mosaic", "prism", "lantern",
  "ember", "aurora", "zenith", "nebula", "pulsar", "quasar", "meteor", "eclipse",
  "magnet", "rocket", "pixel", "byte", "cipher", "vector", "matrix", "kernel",
  "onyx", "ivory", "ebony", "bronze", "brass", "steel", "iron", "nickel",
  "lynx", "falcon2", "heron", "crane", "otter", "ibex", "cobra", "viper",
  "raven", "heron2", "sable", "armadillo", "badger", "weasel", "marten", "ermine",
  "juniper", "cedar2", "almond", "walnut", "acorn", "berries", "cypress", "laurel",
].filter((w) => !w.includes("2")); // de-duplicated to 88 real words

/** crypto-random int in [0, max) without modulo bias */
function secureRandomIndex(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  let x = 0;
  do {
    x = crypto.randomBytes(4).readUInt32BE(0);
  } while (x >= limit);
  return x % max;
}

/**
 * Generate a human-friendly recovery phrase:
 *   «word-word-word-word-word-NNN» (~44 bits + rate limiting + hash-only storage)
 */
export function generateRecoveryCode(): string {
  const words: string[] = [];
  for (let i = 0; i < 5; i++) words.push(RECOVERY_WORDS[secureRandomIndex(RECOVERY_WORDS.length)]);
  const num = String(secureRandomIndex(1000)).padStart(3, "0");
  return `${words.join("-")}-${num}`;
}

/** normalize for comparison (case-insensitive, collapse spaces/dashes) */
function normalizeRecoveryCodeInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

/** SHA-256 hex of the normalized phrase (what lives in the DB) */
export function hashRecoveryCode(raw: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeRecoveryCodeInput(raw))
    .digest("hex");
}

/** constant-time-ish equality compare of two hex hashes */
export function recoveryCodeMatches(raw: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashRecoveryCode(raw), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─────────────────────── v29.2 · managers & granular permissions ───────────────────────
//
// The MAIN admin (مدیر کل) creates staff manager accounts from پنل → مدیران,
// sets their password manually and picks exactly which parts of the panel /
// store they may touch. Permissions live on User.adminPermissions as a JSON
// array of keys; null/empty = the role's default access below.
//
// NOTE (client duplication): this is the SERVER-side source of truth. Client
// components (admin-shell, managers page) keep their own tiny copy of the
// same static metadata because lib/auth imports next/headers cookies and
// must never be bundled into the browser.

/** every permission key the managers UI can grant (labelFa = checkbox label) */
export const ADMIN_PERMISSIONS = [
  { key: "products", labelFa: "محصولات" },
  { key: "categories", labelFa: "دسته‌بندی‌ها" },
  { key: "brands", labelFa: "برندها" },
  { key: "orders", labelFa: "سفارش‌ها" },
  { key: "payments", labelFa: "پرداخت‌ها" },
  { key: "coupons", labelFa: "کدهای تخفیف" },
  { key: "delivery", labelFa: "روش‌های ارسال" },
  { key: "users", labelFa: "کاربران مشتری" },
  { key: "reviews", labelFa: "دیدگاه‌ها" },
  { key: "sliders", labelFa: "اسلایدرها" },
  { key: "stories", labelFa: "استوری‌ها" },
  { key: "showcases", labelFa: "شوکیس‌ها" },
  { key: "pages", labelFa: "صفحات محتوا" },
  { key: "tickets", labelFa: "تیکت‌های پشتیبانی" },
  { key: "messages", labelFa: "پیام‌های مشتریان" },
  { key: "appearance", labelFa: "قالب و ظاهر فروشگاه" },
  { key: "settings", labelFa: "تنظیمات فروشگاه" },
  { key: "logs", labelFa: "گزارش‌ها" },
] as const;
export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[number]["key"];

const PERMISSION_KEYS: ReadonlySet<string> = new Set(ADMIN_PERMISSIONS.map((p) => p.key));

/** default permissions per role — used when adminPermissions is null/empty */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, AdminPermissionKey[]> = {
  SUPER_ADMIN: ADMIN_PERMISSIONS.map((p) => p.key), // (short-circuited anyway)
  ADMIN: ADMIN_PERMISSIONS.map((p) => p.key), // (short-circuited anyway)
  PRODUCT_MANAGER: ["products", "categories", "brands", "reviews"],
  ORDER_MANAGER: ["orders", "payments", "coupons", "delivery"],
  SUPPORT: ["tickets", "messages", "reviews"],
};

/** roles the managers UI can create (SUPER_ADMIN is never creatable there) */
export const MANAGER_ROLES = ["SUPPORT", "ORDER_MANAGER", "PRODUCT_MANAGER", "ADMIN"] as const;

/** JSON-array parse + key validation; NEVER throws (bad data → []) */
export function parseAdminPermissions(raw: string | null | undefined): AdminPermissionKey[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is AdminPermissionKey => typeof k === "string" && PERMISSION_KEYS.has(k));
  } catch {
    return [];
  }
}

/**
 * Granular permission check (used by admin API route guards).
 *  - ADMIN / SUPER_ADMIN: full access to everything (short-circuit true)
 *  - staff roles: explicit permission list when non-empty, otherwise the
 *    role's default permissions; unknown roles → no access.
 * Dashboard/account pages are always allowed for any admin (they carry no
 * permission key — the sidebar never gates them).
 */
export function hasPermission(
  user: { role: string; adminPermissions?: string | null } | null | undefined,
  key: string
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  const list = parseAdminPermissions(user.adminPermissions);
  if (list.length > 0) return list.includes(key as AdminPermissionKey);
  const defaults = ROLE_DEFAULT_PERMISSIONS[user.role];
  return !!defaults && defaults.includes(key as AdminPermissionKey);
}

/** Admin user IF they hold the given permission, else null (route → 403). */
export async function getAdminUserFor(key: string): Promise<AuthUser | null> {
  const user = await getAdminUser();
  if (!user || !hasPermission(user, key)) return null;
  return user;
}
