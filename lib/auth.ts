import crypto from "crypto";
export { auth } from "@/auth";

/**
 * Hashes a plaintext password using salted scrypt (NIST/OWASP recommended).
 * Format: <salt-hex>:<hash-hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Timing-safe password verification against stored scrypt hash.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }

  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

/**
 * Hashes a 6-digit security code using SHA-256.
 */
export function hashSecurityCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Validates a 6-digit security code against a stored hash or code.
 */
export function verifySecurityCode(code: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const cleanCode = code.trim();
  const hashed = crypto.createHash("sha256").update(cleanCode).digest("hex");
  return stored === cleanCode || stored === hashed;
}
