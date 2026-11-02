import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { purgeTestUsers } from "@/lib/communitySeed";

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "purge_tests";

    if (action === "purge_tests") {
      const purgedCount = await purgeTestUsers();
      return NextResponse.json({
        success: true,
        message: `Purged ${purgedCount} automated test & ghost accounts.`,
        purgedCount,
      });
    }

    if (action === "seed") {
      return NextResponse.json({
        success: true,
        message: "Seeding synthetic players is disabled. Strictly tracking registered users.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Community action error:", error);
    return NextResponse.json(
      { error: "Failed to perform maintenance action" },
      { status: 500 }
    );
  }
}
