import prisma from "./prisma";

export interface RegisteredUserFilter {
  search?: string;
  plan?: string;
}

/**
 * Filter definition for genuine registered human accounts.
 * Excludes anonymous guests, Playwright E2E artifacts, and synthetic test IDs.
 */
export const REGISTERED_USER_WHERE_CLAUSE = {
  AND: [
    {
      OR: [
        { googleId: { not: null } },
        { email: { not: null } },
        { username: { not: null } },
      ],
    },
    {
      NOT: [
        { username: { startsWith: "mockuser" } },
        { username: { startsWith: "test-" } },
        { username: { startsWith: "verify-user-" } },
        { username: { startsWith: "tacticsmaster" } },
        { username: { startsWith: "adv_mvy" } },
        { id: { startsWith: "verify-user-" } },
        { id: { startsWith: "test-engine-user-" } },
        { id: { startsWith: "test_user_" } },
        { id: { startsWith: "test-qol-guest" } },
        { id: { startsWith: "guest_spec_" } },
        { id: { startsWith: "guest_client_" } },
        { AND: [{ email: { not: null } }, { email: { contains: "test.chess" } }] },
        { AND: [{ email: { not: null } }, { email: { contains: "test_spec_" } }] },
        { AND: [{ email: { not: null } }, { email: { contains: "test_client_" } }] },
      ],
    },
  ],
};

/**
 * Fetch strictly real registered users from the database.
 */
export async function getRegisteredUsers() {
  return prisma.user.findMany({
    where: REGISTERED_USER_WHERE_CLAUSE,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatar: true,
      elo: true,
      peakElo: true,
      streak: true,
      bestStreak: true,
      isCalibrated: true,
      calibrationStep: true,
      plan: true,
      googleId: true,
      createdAt: true,
    },
  });
}

/**
 * Purge leftover test accounts and anonymous empty guest sessions.
 */
export async function purgeTestUsers(): Promise<number> {
  const result = await prisma.user.deleteMany({
    where: {
      OR: [
        { username: { startsWith: "mockuser" } },
        { username: { startsWith: "tacticsmaster" } },
        { username: { startsWith: "adv_mvy" } },
        { id: { startsWith: "verify-user-" } },
        { id: { startsWith: "test-engine-user-" } },
        { id: { startsWith: "test_user_" } },
        { id: { startsWith: "test-qol-guest" } },
        { id: { startsWith: "guest_spec_" } },
        { id: { startsWith: "guest_client_" } },
        { email: { contains: "test.chess" } },
        { email: { contains: "test_spec_" } },
        { email: { contains: "test_client_" } },
        {
          AND: [
            { username: null },
            { googleId: null },
            { email: null },
          ],
        },
      ],
    },
  });

  return result.count;
}

/**
 * Deprecated: Seeding fake players is intentionally disabled.
 * Only genuine registered users are tracked on the platform.
 */
export async function seedActiveCommunity(): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  console.log("Community seeding disabled: strictly tracking registered users.");
  return { created: 0, updated: 0, total: 0 };
}
