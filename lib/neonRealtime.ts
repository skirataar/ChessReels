import { createRealtime, rawSql } from "@neon/realtime/server";

export function getNeonRealtime() {
  const secret = process.env.NEON_REALTIME_SECRET;
  const url = process.env.NEON_REALTIME_URL;

  if (!secret) {
    throw new Error("NEON_REALTIME_SECRET is not configured");
  }

  return createRealtime({
    secret,
    db: "neondb",
  });
}

export async function sealLeaderboardQuery() {
  const rt = getNeonRealtime();
  const query = rawSql(
    'SELECT id, username, "displayName", elo, plan FROM "User" ORDER BY elo DESC LIMIT 20'
  );
  return await rt.seal({ query });
}
