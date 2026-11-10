import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getSanitizedDbUrl(): string {
  let url = process.env.DATABASE_URL || "";
  if (url && !url.includes("connection_limit=")) {
    url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=20";
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const url = getSanitizedDbUrl();

  const adapter = new PrismaPg({
    connectionString: url,
    // Strict connection limit: Exactly 1 client per pool in serverless environments
    max: 1,
    // Rapidly reap idle connections so pooler slots are returned immediately
    idleTimeoutMillis: 1500,
    // Allow up to 20 seconds during pool contention before failing
    connectionTimeoutMillis: 20000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Global singleton cached across serverless warm starts & development HMR
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

/**
 * Executes a database operation with transient retry support for connection pool spikes (e.g., 08P01 max_client_conn).
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 400
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isPoolError =
        err?.code === "08P01" ||
        err?.message?.includes("08P01") ||
        err?.message?.includes("max_client_conn") ||
        err?.message?.includes("connection pool") ||
        err?.message?.includes("Connection refused") ||
        err?.message?.includes("Timed out fetching a new connection");

      if (isPoolError && attempt <= retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Sanitizes any raw database/Prisma errors before sending to client.
 */
export function sanitizeDbError(error: any): string {
  const msg = String(error?.message || error || "");
  if (
    !msg ||
    msg.includes("08P01") ||
    msg.includes("max_client_conn") ||
    msg.includes("PrismaClient") ||
    msg.includes("invocation") ||
    msg.includes("Can't reach database") ||
    msg.includes("connection pool")
  ) {
    return "Server is busy. Please try again in a moment.";
  }
  return msg || "An unexpected error occurred.";
}

export default prisma;
