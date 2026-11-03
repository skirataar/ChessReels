import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getTierConfig, updateTierConfig } from "@/lib/tierConfig";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const config = await getTierConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Admin fetch config error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tier configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { freePuzzleLimit, freeWindowHours, adFrequencyPuzzles, proMonthlyPrice, annualDiscountPercent } = body;

    const updated = await updateTierConfig({
      freePuzzleLimit:
        freePuzzleLimit !== undefined ? Number(freePuzzleLimit) : undefined,
      freeWindowHours:
        freeWindowHours !== undefined ? Number(freeWindowHours) : undefined,
      adFrequencyPuzzles:
        adFrequencyPuzzles !== undefined ? Number(adFrequencyPuzzles) : undefined,
      proMonthlyPrice:
        proMonthlyPrice !== undefined ? Number(proMonthlyPrice) : undefined,
      annualDiscountPercent:
        annualDiscountPercent !== undefined ? Number(annualDiscountPercent) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Updated tier rules: ${updated.freePuzzleLimit} puzzles / ${updated.freeWindowHours}h for Free tier. Ads every ${updated.adFrequencyPuzzles} puzzles.`,
      config: updated,
    });
  } catch (error) {
    console.error("Admin update config error:", error);
    return NextResponse.json(
      { error: "Failed to update tier configuration" },
      { status: 500 }
    );
  }
}
