import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/chess_reel?schema=public";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // Keep pooled connections warm between admin visits. The pg default
      // idle timeout is 10s, so occasional dashboard loads paid a ~2-5s
      // reconnect cost on every visit. TCP keepalive also detects dead
      // connections instead of silently reusing them.
      max: 5,
      idleTimeoutMillis: 10 * 60 * 1000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    }),
  });

// Cache the client on globalThis. Next.js compiles instrumentation and route
// handlers into separate bundles, so this ensures they share one connection
// pool (the startup prewarm then benefits real requests). It also preserves
// the client across HMR reloads in development.
globalForPrisma.prisma = prisma;

export default prisma;
