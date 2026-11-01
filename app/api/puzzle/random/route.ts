import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Puzzle } from "@/lib/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eloParam = searchParams.get("elo");

    const elo = eloParam !== null ? Number.parseInt(eloParam, 10) : 800;

    if (Number.isNaN(elo)) {
      return NextResponse.json(
        { error: "Invalid 'elo' parameter. Must be an integer." },
        { status: 400 }
      );
    }

    const countParam = searchParams.get("count");
    const count =
      countParam !== null
        ? Math.min(10, Math.max(1, Number.parseInt(countParam, 10) || 1))
        : 1;

    const minElo = Math.max(0, elo - 150);
    const maxElo = elo + 150;

    const puzzles = await prisma.$queryRaw<Puzzle[]>`
      SELECT *
      FROM "Puzzle"
      WHERE "rating" >= ${minElo} AND "rating" <= ${maxElo}
      ORDER BY RANDOM()
      LIMIT ${count};
    `;

    if (!puzzles || puzzles.length === 0) {
      return NextResponse.json(
        {
          message: `No puzzle found within Elo range [${minElo}, ${maxElo}].`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(count > 1 ? puzzles : puzzles[0]);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }

    console.error("Failed to query random puzzle:", error);
    return NextResponse.json(
      { error: "Internal server error fetching puzzle" },
      { status: 500 }
    );
  }
}
