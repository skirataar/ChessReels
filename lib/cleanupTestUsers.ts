import { Pool } from "pg";
import type { PoolClient } from "pg";

export interface UserSummary {
  id: string;
  name: string;
  username: string;
  email: string | null;
  elo: number;
  createdAt: string;
  isTestAccount: boolean;
  isTestPattern: boolean;
}

let poolInstance: Pool | null = null;

export function getDbPool(): Pool {
  if (!poolInstance) {
    const connectionString =
      process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    poolInstance = new Pool({
      connectionString,
    });
  }
  return poolInstance;
}

export const DEDICATED_TEST_EMAIL = "devtest@doomchess.local";
export const DEDICATED_TEST_USERNAME = "devtest";

export function isDedicatedTestAccount(account: {
  email?: string | null;
  username?: string | null;
}): boolean {
  const email = (account.email || "").toLowerCase().trim();
  const username = (account.username || "").toLowerCase().trim();
  return email === DEDICATED_TEST_EMAIL || username === DEDICATED_TEST_USERNAME || username === "devtester";
}

export function isTestAccountPattern(account: {
  isTestAccount?: boolean | null;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
}): boolean {
  if (isDedicatedTestAccount(account)) return false;

  if (account.isTestAccount) return true;

  const email = (account.email || "").toLowerCase().trim();
  if (
    email.includes("@test.") ||
    email.endsWith("@example.com") ||
    email.startsWith("test") ||
    email.startsWith("qa") ||
    email.includes("tester")
  ) {
    return true;
  }

  const username = (account.username || "").toLowerCase().trim();
  if (
    username.startsWith("test") ||
    username.startsWith("qa") ||
    username.startsWith("qa_mock_") ||
    username.startsWith("elotest_") ||
    username.startsWith("calib_") ||
    username.startsWith("solv_") ||
    username.startsWith("idle_") ||
    username.startsWith("flsh_") ||
    username.startsWith("auto_") ||
    username.startsWith("lo_") ||
    username.startsWith("hi_") ||
    username.startsWith("lgt_") ||
    username.startsWith("db_")
  ) {
    return true;
  }

  const displayName = (account.displayName || "").toLowerCase().trim();
  if (
    displayName.startsWith("test") ||
    displayName.startsWith("qa") ||
    displayName.includes("tester") ||
    displayName.includes("placement")
  ) {
    return true;
  }

  return false;
}

/**
 * Safely delete user records across all referencing tables first,
 * avoiding foreign-key constraint violations on PostgreSQL.
 */
export async function executeCascadingUserDelete(
  client: PoolClient,
  userIds: string[],
  emails: string[] = []
): Promise<{ deletedCount: number; deletedUserIds: string[] }> {
  // Query to ensure the dedicated test account id is never deleted
  const dedicatedRes = await client.query(
    `SELECT id FROM "User" WHERE email = $1 OR username = $2;`,
    [DEDICATED_TEST_EMAIL, DEDICATED_TEST_USERNAME]
  );
  const dedicatedIds = new Set(dedicatedRes.rows.map((r: { id: string }) => r.id));

  const validIds = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0 && !dedicatedIds.has(id)))
  );
  const validEmails = Array.from(
    new Set(emails.filter((e): e is string => typeof e === "string" && e.trim().length > 0 && e.toLowerCase().trim() !== DEDICATED_TEST_EMAIL))
  );

  if (validIds.length === 0 && validEmails.length === 0) {
    return { deletedCount: 0, deletedUserIds: [] };
  }

  try {
    await client.query("BEGIN;");

    // 1. Delete Better Auth sessions
    if (validIds.length > 0) {
      await client.query(
        `DELETE FROM "session" WHERE "userId" = ANY($1::text[]);`,
        [validIds]
      );
    }

    // 2. Delete Better Auth accounts
    if (validIds.length > 0) {
      await client.query(
        `DELETE FROM "account" WHERE "userId" = ANY($1::text[]);`,
        [validIds]
      );
    }

    // 3. Delete Friendships
    if (validIds.length > 0) {
      await client.query(
        `DELETE FROM "Friendship" WHERE "userId" = ANY($1::text[]) OR "friendId" = ANY($1::text[]);`,
        [validIds]
      );
    }

    // 4. Delete PuzzleHistory
    if (validIds.length > 0) {
      await client.query(
        `DELETE FROM "PuzzleHistory" WHERE "userId" = ANY($1::text[]);`,
        [validIds]
      );
    }

    // 5. Delete PuzzleLike
    if (validIds.length > 0) {
      await client.query(
        `DELETE FROM "PuzzleLike" WHERE "userId" = ANY($1::text[]);`,
        [validIds]
      );
    }

    // 6. Delete from Better Auth user table
    if (validIds.length > 0 && validEmails.length > 0) {
      await client.query(
        `DELETE FROM "user" WHERE "id" = ANY($1::text[]) OR "email" = ANY($2::text[]);`,
        [validIds, validEmails]
      );
    } else if (validIds.length > 0) {
      await client.query(
        `DELETE FROM "user" WHERE "id" = ANY($1::text[]);`,
        [validIds]
      );
    } else if (validEmails.length > 0) {
      await client.query(
        `DELETE FROM "user" WHERE "email" = ANY($1::text[]);`,
        [validEmails]
      );
    }

    // 7. Delete from Prisma User table
    let deleteRes;
    if (validIds.length > 0 && validEmails.length > 0) {
      deleteRes = await client.query(
        `DELETE FROM "User" WHERE "id" = ANY($1::text[]) OR ("email" IS NOT NULL AND "email" = ANY($2::text[])) RETURNING id;`,
        [validIds, validEmails]
      );
    } else if (validIds.length > 0) {
      deleteRes = await client.query(
        `DELETE FROM "User" WHERE "id" = ANY($1::text[]) RETURNING id;`,
        [validIds]
      );
    } else if (validEmails.length > 0) {
      deleteRes = await client.query(
        `DELETE FROM "User" WHERE "email" IS NOT NULL AND "email" = ANY($1::text[]) RETURNING id;`,
        [validEmails]
      );
    }

    await client.query("COMMIT;");

    const deletedIds = deleteRes?.rows?.map((r: { id: string }) => r.id) || validIds;
    return {
      deletedCount: Math.max(deletedIds.length, deleteRes?.rowCount || 0),
      deletedUserIds: deletedIds,
    };
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  }
}

/**
 * Fetch the 30 most recently created user accounts from the database.
 */
export async function getRecentAccounts(limit = 30): Promise<{
  accounts: UserSummary[];
  flaggedCount: number;
  totalCount: number;
}> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const totalRes = await client.query(`SELECT COUNT(*) FROM "User";`);
    const totalCount = parseInt(totalRes.rows[0]?.count || "0", 10);

    const flaggedRes = await client.query(`
      SELECT COUNT(*) FROM "User"
      WHERE "isTestAccount" = true
         OR email ILIKE '%@test.%'
         OR email ILIKE '%@example.com'
         OR email ILIKE 'test%'
         OR email ILIKE 'qa%'
         OR username ILIKE 'test%'
         OR username ILIKE 'qa%'
         OR username ILIKE 'qa_mock_%'
         OR username ILIKE 'elotest_%'
         OR username ILIKE 'calib_%'
         OR username ILIKE 'solv_%'
         OR username ILIKE 'idle_%'
         OR username ILIKE 'flsh_%'
         OR username ILIKE 'auto_%'
         OR username ILIKE 'lo_%'
         OR username ILIKE 'hi_%'
         OR username ILIKE 'lgt_%'
         OR username ILIKE 'db_%';
    `);
    const flaggedCount = parseInt(flaggedRes.rows[0]?.count || "0", 10);

    const queryRes = await client.query(
      `SELECT id, username, "displayName", email, elo, "createdAt", "isTestAccount"
       FROM "User"
       ORDER BY "createdAt" DESC
       LIMIT $1;`,
      [limit]
    );

    const accounts: UserSummary[] = queryRes.rows.map((row: {
      id: string;
      username: string | null;
      displayName: string | null;
      email: string | null;
      elo: number | null;
      createdAt: Date;
      isTestAccount: boolean | null;
    }) => {
      const isPattern = isTestAccountPattern({
        isTestAccount: row.isTestAccount,
        email: row.email,
        username: row.username,
        displayName: row.displayName,
      });

      return {
        id: row.id,
        name: row.displayName || row.username || "Anonymous",
        username: row.username || "unknown",
        email: row.email,
        elo: row.elo ?? 800,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        isTestAccount: Boolean(row.isTestAccount),
        isTestPattern: isPattern,
      };
    });

    return { accounts, flaggedCount, totalCount };
  } finally {
    client.release();
  }
}

/**
 * Purge all flagged test accounts matching test patterns or having isTestAccount: true.
 */
export async function purgeFlaggedTestAccounts(): Promise<{
  deletedCount: number;
  deletedUserIds: string[];
}> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const candidates = await client.query(`
      SELECT id, email FROM "User"
      WHERE ("isTestAccount" = true
         OR email ILIKE '%@test.%'
         OR email ILIKE '%@example.com'
         OR email ILIKE 'test%'
         OR email ILIKE 'qa%'
         OR username ILIKE 'test%'
         OR username ILIKE 'qa%'
         OR username ILIKE 'qa_mock_%'
         OR username ILIKE 'elotest_%'
         OR username ILIKE 'calib_%'
         OR username ILIKE 'solv_%'
         OR username ILIKE 'idle_%'
         OR username ILIKE 'flsh_%'
         OR username ILIKE 'auto_%'
         OR username ILIKE 'lo_%'
         OR username ILIKE 'hi_%'
         OR username ILIKE 'lgt_%'
         OR username ILIKE 'db_%')
        AND (email IS NULL OR email != '${DEDICATED_TEST_EMAIL}')
        AND (username IS NULL OR (username != '${DEDICATED_TEST_USERNAME}' AND username != 'devtester'));
    `);

    // Also check Better Auth user table
    const baCandidates = await client.query(`
      SELECT id, email FROM "user"
      WHERE ("isTestAccount" = true
         OR email ILIKE '%@test.%'
         OR email ILIKE '%@example.com'
         OR email ILIKE 'test%'
         OR email ILIKE 'qa%'
         OR name ILIKE 'test%'
         OR name ILIKE 'qa%')
        AND (email IS NULL OR email != '${DEDICATED_TEST_EMAIL}');
    `);

    const userIds = [
      ...candidates.rows.map((r: { id: string }) => r.id),
      ...baCandidates.rows.map((r: { id: string }) => r.id),
    ];
    const emails = [
      ...candidates.rows.map((r: { email: string | null }) => r.email).filter(Boolean),
      ...baCandidates.rows.map((r: { email: string | null }) => r.email).filter(Boolean),
    ] as string[];

    return await executeCascadingUserDelete(client, userIds, emails);
  } finally {
    client.release();
  }
}

/**
 * Delete explicitly selected accounts by user ID.
 */
export async function deleteSelectedAccounts(
  userIds: string[]
): Promise<{ deletedCount: number; deletedUserIds: string[] }> {
  if (!userIds || userIds.length === 0) {
    return { deletedCount: 0, deletedUserIds: [] };
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    // Find emails for these IDs if any exist
    const emailsRes = await client.query(
      `SELECT email FROM "User" WHERE id = ANY($1::text[]) AND email IS NOT NULL;`,
      [userIds]
    );
    const emails = emailsRes.rows.map((r: { email: string }) => r.email);

    return await executeCascadingUserDelete(client, userIds, emails);
  } finally {
    client.release();
  }
}
