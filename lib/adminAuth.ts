import crypto from "crypto";
import { NextRequest } from "next/server";

const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "chessreel_admin_master_2026";

/**
 * Verifies if the provided secret matches the configured ADMIN_SECRET
 * using timing-safe string comparison.
 */
export function verifyAdminSecret(secretInput: string): boolean {
  if (!secretInput || typeof secretInput !== "string") return false;

  const expectedBuffer = Buffer.from(ADMIN_SECRET);
  const inputBuffer = Buffer.from(secretInput);

  if (expectedBuffer.length !== inputBuffer.length) {
    // Prevent timing leak on length comparison
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, inputBuffer);
}

/**
 * Creates a cryptographically signed admin session token.
 */
export function createAdminToken(): string {
  const payload = `chessreel_admin_${Date.now()}`;
  const hmac = crypto.createHmac("sha256", ADMIN_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verifies an admin session token signature.
 */
export function verifyAdminToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  if (!payload || !signature) return false;

  const hmac = crypto.createHmac("sha256", ADMIN_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * Extracts and verifies admin authorization from a NextRequest.
 * Checks cookie `chess_reel_admin_token`, header `x-admin-key`, or Bearer token.
 */
export function isAdminAuthenticated(request: NextRequest): boolean {
  // 1. Direct header key check
  const headerKey = request.headers.get("x-admin-key");
  if (headerKey && verifyAdminSecret(headerKey)) {
    return true;
  }

  // 2. Cookie session check
  const tokenCookie = request.cookies.get("chess_reel_admin_token")?.value;
  if (tokenCookie && verifyAdminToken(tokenCookie)) {
    return true;
  }

  // 3. Authorization Bearer header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (verifyAdminToken(bearer) || verifyAdminSecret(bearer)) {
      return true;
    }
  }

  return false;
}
