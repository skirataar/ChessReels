import { NextResponse } from "next/server";
import { getTierConfig } from "@/lib/tierConfig";

export async function GET() {
  try {
    const config = await getTierConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to fetch tier config:", error);
    return NextResponse.json(
      { error: "Failed to fetch tier config" },
      { status: 500 }
    );
  }
}
