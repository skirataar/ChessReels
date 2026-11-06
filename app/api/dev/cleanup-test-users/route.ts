import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import {
  getRecentAccounts,
  purgeFlaggedTestAccounts,
  deleteSelectedAccounts,
} from "@/lib/cleanupTestUsers";

/**
 * Security verification:
 * Strictly restricted to process.env.NODE_ENV === 'development' or an admin secret check.
 */
function isDevOrAdminAuthorized(request: NextRequest): boolean {
  // 1. Allowed in local development environment
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // 2. Check admin secret header or query param
  const adminSecret = process.env.ADMIN_SECRET;
  const headerSecret =
    request.headers.get("x-admin-secret") ||
    request.headers.get("x-admin-key") ||
    request.headers.get("x-dev-secret");
  const querySecret = new URL(request.url).searchParams.get("secret");

  if (
    adminSecret &&
    (headerSecret === adminSecret || querySecret === adminSecret)
  ) {
    return true;
  }

  // 3. Check admin cookie session or Bearer token
  if (isAdminAuthenticated(request)) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isDevOrAdminAuthorized(request)) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Restricted to development environment or valid admin secret.",
      },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "30", 10);
    const limit = Math.min(100, Math.max(1, isNaN(limitParam) ? 30 : limitParam));

    const result = await getRecentAccounts(limit);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[dev/cleanup-test-users] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isDevOrAdminAuthorized(request)) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Restricted to development environment or valid admin secret.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === "purge_flagged" || action === "purge_all") {
      const result = await purgeFlaggedTestAccounts();
      return NextResponse.json({
        success: true,
        action: "purge_flagged",
        deletedCount: result.deletedCount,
        deletedUserIds: result.deletedUserIds,
        message: `Successfully purged ${result.deletedCount} flagged test account(s) and cascading records.`,
      });
    }

    if (action === "delete_selected") {
      const userIds = Array.isArray(body?.userIds) ? body.userIds : [];
      if (userIds.length === 0) {
        return NextResponse.json(
          { error: "No userIds provided for deletion" },
          { status: 400 }
        );
      }

      const result = await deleteSelectedAccounts(userIds);
      return NextResponse.json({
        success: true,
        action: "delete_selected",
        deletedCount: result.deletedCount,
        deletedUserIds: result.deletedUserIds,
        message: `Successfully deleted ${result.deletedCount} selected account(s) and cascading records.`,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Expected 'purge_flagged' or 'delete_selected' with userIds array.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[dev/cleanup-test-users] POST error:", error);
    return NextResponse.json(
      { error: "Failed to delete test accounts", details: (error as Error).message },
      { status: 500 }
    );
  }
}

