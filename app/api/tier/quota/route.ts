import { NextRequest, NextResponse } from "next/server";
import { checkUserQuota, getTierConfig } from "@/lib/tierConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || searchParams.get("guestId");
    const plan = searchParams.get("plan");

    if (!userId) {
      return NextResponse.json(
        { error: "userId or guestId is required" },
        { status: 400 }
      );
    }

    const [quota, config] = await Promise.all([
      checkUserQuota(userId, plan),
      getTierConfig(),
    ]);

    return NextResponse.json({
      quota,
      config,
    });
  } catch (error) {
    console.error("Failed to fetch user quota status:", error);
    return NextResponse.json(
      { error: "Failed to fetch user quota" },
      { status: 500 }
    );
  }
}
