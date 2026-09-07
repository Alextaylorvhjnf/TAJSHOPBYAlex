import crypto from "crypto";

/**
 * Symmetric encryption for secrets stored at rest (e.g. the SMTP password).
 *
 * Cipher: AES-256-GCM. The key is derived via scrypt from AUTH_SECRET (env) —
 * the encryption key is therefore NEVER stored in the database.
 *
 * Notes:
 * - Changing AUTH_SECRET makes previously stored secrets undecryptable
 *   (they are then treated as "wrong password" — simply re-enter the value).
 * - Encoded format: "v1:<iv-b64url>:<tag-b64url>:<ct-b64url>" (no colons inside any value)
 */

const VERSION = "v1";
const KEY_LEN = 32; // AES-256
const IV_LEN = 12;

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Dev fallback keeps local flows working; production must set AUTH_SECRET.
    console.warn("[CRYPTO] AUTH_SECRET is not set — using an insecure development key");
  }
  return crypto.scryptSync(secret ?? "taj-insecure-dev-secret", "taj-smtp-at-rest-v1", KEY_LEN);
}

/** Encrypt a plaintext secret → versioned, self-contained ciphertext string. */
export function encryptSecret(plain: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(":");
}

/** Decrypt a value produced by encryptSecret. Returns null when not decryptable. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const key = deriveKey();
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ct = Buffer.from(parts[3], "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    // wrong key (AUTH_SECRET changed) or tampered data
    return null;
  }
}

/** SHA-256 hex hash — used for password-reset tokens (DB never stores raw token). */
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
