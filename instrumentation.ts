/**
 * Runs once when the Node.js server starts. Opening the database connections
 * here means the first user request does not pay the full TLS/connection
 * setup cost (previously ~2-5s on a cold server).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { default: prisma } = await import("@/lib/prisma");
    // Open two connections for the route's parallel queries, and run an ORM
    // query so Prisma's query compiler is initialized before the first request.
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.$queryRaw`SELECT 1`,
      prisma.user.count(),
    ]);
  } catch (error) {
    // A failed prewarm should never prevent the server from starting.
    console.error("Database prewarm failed:", error);
  }
}
