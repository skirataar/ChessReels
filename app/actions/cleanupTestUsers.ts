"use server";

import {
  getRecentAccounts,
  purgeFlaggedTestAccounts,
  deleteSelectedAccounts,
  UserSummary,
} from "@/lib/cleanupTestUsers";

/**
 * Server Action: Fetch the 30 most recent accounts and flagged test count.
 */
export async function fetchRecentAccountsAction(limit = 30): Promise<{
  success: boolean;
  accounts: UserSummary[];
  flaggedCount: number;
  totalCount: number;
  error?: string;
}> {
  try {
    const data = await getRecentAccounts(limit);
    return {
      success: true,
      ...data,
    };
  } catch (error) {
    console.error("fetchRecentAccountsAction error:", error);
    return {
      success: false,
      accounts: [],
      flaggedCount: 0,
      totalCount: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Server Action: Purge all accounts matching test patterns or isTestAccount: true.
 */
export async function purgeFlaggedTestAccountsAction(): Promise<{
  success: boolean;
  deletedCount: number;
  deletedUserIds: string[];
  message: string;
  error?: string;
}> {
  try {
    const result = await purgeFlaggedTestAccounts();
    return {
      success: true,
      deletedCount: result.deletedCount,
      deletedUserIds: result.deletedUserIds,
      message: `Successfully purged ${result.deletedCount} flagged test account(s).`,
    };
  } catch (error) {
    console.error("purgeFlaggedTestAccountsAction error:", error);
    return {
      success: false,
      deletedCount: 0,
      deletedUserIds: [],
      message: "Failed to purge test accounts.",
      error: (error as Error).message,
    };
  }
}

/**
 * Server Action: Delete explicitly selected accounts by user ID with cascading cleanup.
 */
export async function deleteSelectedAccountsAction(
  userIds: string[]
): Promise<{
  success: boolean;
  deletedCount: number;
  deletedUserIds: string[];
  message: string;
  error?: string;
}> {
  try {
    const result = await deleteSelectedAccounts(userIds);
    return {
      success: true,
      deletedCount: result.deletedCount,
      deletedUserIds: result.deletedUserIds,
      message: `Successfully deleted ${result.deletedCount} selected account(s).`,
    };
  } catch (error) {
    console.error("deleteSelectedAccountsAction error:", error);
    return {
      success: false,
      deletedCount: 0,
      deletedUserIds: [],
      message: "Failed to delete selected accounts.",
      error: (error as Error).message,
    };
  }
}

