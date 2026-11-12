import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const posthogLogProvider =
  posthogProjectToken && posthogHost
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "chess-reel" }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${posthogHost.replace(/\/$/, "")}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${posthogProjectToken}`,
                "Content-Type": "application/json",
              },
            }),
          }),
        ],
      })
    : undefined;

if (!posthogLogProvider && process.env.NODE_ENV !== "production") {
  const missingVariable = posthogProjectToken
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";

  console.warn(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

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
