import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNeonAuthInfo } from "@/lib/neonAuth";
import { uploadObject, getObject } from "@/lib/neonStorage";
import { invokeHelloFunction } from "@/lib/neonFunctions";
import { sealLeaderboardQuery } from "@/lib/neonRealtime";

export async function GET() {
  const results: Record<string, { status: "ok" | "error"; details: unknown; latencyMs: number }> = {};

  // 1. Postgres Database Check
  const startDb = Date.now();
  try {
    const userCount = await prisma.user.count();
    results.postgres = {
      status: "ok",
      details: {
        engine: "Neon Lakebase Postgres",
        userCount,
        branch: process.env.NEON_BRANCH || "production",
      },
      latencyMs: Date.now() - startDb,
    };
  } catch (err: unknown) {
    results.postgres = {
      status: "error",
      details: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startDb,
    };
  }

  // 2. Neon Auth Check
  const startAuth = Date.now();
  try {
    const authInfo = await getNeonAuthInfo();
    results.auth = {
      status: "ok",
      details: {
        baseUrl: authInfo.baseUrl,
        jwksKeys: authInfo.keysCount,
      },
      latencyMs: Date.now() - startAuth,
    };
  } catch (err: unknown) {
    results.auth = {
      status: "error",
      details: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startAuth,
    };
  }

  // 3. Object Storage Check (S3 Bucket)
  const startStorage = Date.now();
  try {
    const testKey = `healthcheck/test-${Date.now()}.txt`;
    const testContent = "Neon Object Storage verified successfully";
    await uploadObject(testKey, testContent, "text/plain");
    const retrieved = await getObject(testKey);
    results.objectStorage = {
      status: "ok",
      details: {
        bucket: process.env.S3_BUCKET || "assets",
        endpoint: process.env.AWS_ENDPOINT_URL_S3,
        verifiedKey: testKey,
        verifiedContent: retrieved.data?.toString("utf-8"),
      },
      latencyMs: Date.now() - startStorage,
    };
  } catch (err: unknown) {
    results.objectStorage = {
      status: "error",
      details: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startStorage,
    };
  }

  // 4. Neon Functions Check
  const startFunctions = Date.now();
  try {
    const fnResult = await invokeHelloFunction();
    results.functions = {
      status: "ok",
      details: {
        url: fnResult.url,
        output: fnResult.output.trim(),
      },
      latencyMs: Date.now() - startFunctions,
    };
  } catch (err: unknown) {
    results.functions = {
      status: "error",
      details: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startFunctions,
    };
  }

  // 5. Neon Realtime Check
  const startRealtime = Date.now();
  try {
    const sealed = await sealLeaderboardQuery();
    results.realtime = {
      status: "ok",
      details: {
        url: process.env.NEON_REALTIME_URL,
        queryFingerprint: sealed.queryFingerprint,
        expiresAt: sealed.expiresAt,
      },
      latencyMs: Date.now() - startRealtime,
    };
  } catch (err: unknown) {
    results.realtime = {
      status: "error",
      details: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startRealtime,
    };
  }

  const allHealthy = Object.values(results).every((r) => r.status === "ok");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      allServicesOperational: allHealthy,
      timestamp: new Date().toISOString(),
      services: results,
    },
    { status: allHealthy ? 200 : 500 }
  );
}
