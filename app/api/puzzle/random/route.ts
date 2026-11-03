import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Puzzle } from "@/lib/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idParam = searchParams.get("id");
    if (idParam) {
      try {
        const singlePuzzle = await prisma.puzzle.findUnique({
          where: { id: idParam },
        });
        if (singlePuzzle) {
          return NextResponse.json(singlePuzzle);
        }
      } catch (err) {
        console.error("Failed to query puzzle by ID:", err);
      }
    }

    const eloParam = searchParams.get("elo");
    const minRatingParam = searchParams.get("minRating");
    const maxRatingParam = searchParams.get("maxRating");
    const themesParam = searchParams.get("themes");

    const elo = eloParam !== null ? Number.parseInt(eloParam, 10) : 800;

    let minElo: number;
    let maxElo: number;

    if (minRatingParam !== null && maxRatingParam !== null) {
      minElo = Math.max(0, Number.parseInt(minRatingParam, 10) || 400);
      maxElo = Math.max(minElo, Number.parseInt(maxRatingParam, 10) || 2800);
    } else if (minRatingParam !== null) {
      minElo = Math.max(0, Number.parseInt(minRatingParam, 10) || 400);
      maxElo = 2800;
    } else if (maxRatingParam !== null) {
      minElo = 0;
      maxElo = Math.max(0, Number.parseInt(maxRatingParam, 10) || 2800);
    } else {
      if (Number.isNaN(elo)) {
        return NextResponse.json(
          { error: "Invalid 'elo' parameter. Must be an integer." },
          { status: 400 }
        );
      }
      minElo = Math.max(0, elo - 150);
      maxElo = elo + 150;
    }

    const countParam = searchParams.get("count");
    const count =
      countParam !== null
        ? Math.min(10, Math.max(1, Number.parseInt(countParam, 10) || 1))
        : 1;

    const userId = searchParams.get("userId") || searchParams.get("guestId");

    // Parse themes if provided (comma-separated or space-separated)
    const rawThemes = themesParam
      ? themesParam
          .split(/[,\s]+/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const themeConditions = rawThemes.map(
      (t) => Prisma.sql`p."themes" ILIKE ${"%" + t + "%"}`
    );
    const themeClause =
      themeConditions.length > 0
        ? Prisma.sql`AND (${Prisma.join(themeConditions, " OR ")})`
        : Prisma.empty;

    const themeConditionsFallback = rawThemes.map(
      (t) => Prisma.sql`"themes" ILIKE ${"%" + t + "%"}`
    );
    const themeClauseFallback =
      themeConditionsFallback.length > 0
        ? Prisma.sql`AND (${Prisma.join(themeConditionsFallback, " OR ")})`
        : Prisma.empty;

    let puzzles: Puzzle[] = [];

    if (userId) {
      // 1. Fast path: Bernoulli sampling on 6.15M dataset (under 150ms)
      try {
        puzzles = await prisma.$queryRaw<Puzzle[]>`
          SELECT p.*
          FROM "Puzzle" AS p TABLESAMPLE BERNOULLI (0.5)
          WHERE p."rating" >= ${minElo} AND p."rating" <= ${maxElo}
            ${themeClause}
            AND NOT EXISTS (
              SELECT 1 FROM "PuzzleHistory" ph
              WHERE ph."userId" = ${userId} AND ph."puzzleId" = p."id"
            )
          LIMIT ${count};
        `;
      } catch (err) {
        console.error("Fast path Bernoulli query error:", err);
      }

      // Fallback with fast random offset if sample yielded 0 rows
      if (!puzzles || puzzles.length === 0) {
        try {
          const randOffset = Math.floor(Math.random() * 200);
          puzzles = await prisma.$queryRaw<Puzzle[]>`
            SELECT p.*
            FROM "Puzzle" AS p
            WHERE p."rating" >= ${minElo} AND p."rating" <= ${maxElo}
              ${themeClause}
              AND NOT EXISTS (
                SELECT 1 FROM "PuzzleHistory" ph
                WHERE ph."userId" = ${userId} AND ph."puzzleId" = p."id"
              )
            OFFSET ${randOffset}
            LIMIT ${count};
          `;
        } catch {}
      }
    }

    // 2. Fast path for guest / non-personalized queries
    if (!puzzles || puzzles.length === 0) {
      try {
        puzzles = await prisma.$queryRaw<Puzzle[]>`
          SELECT *
          FROM "Puzzle" TABLESAMPLE BERNOULLI (0.5)
          WHERE "rating" >= ${minElo} AND "rating" <= ${maxElo}
            ${themeClauseFallback}
          LIMIT ${count};
        `;
      } catch {}
    }

    // 3. Fallback if sample was too sparse
    if (!puzzles || puzzles.length === 0) {
      const randOffset = Math.floor(Math.random() * 200);
      try {
        puzzles = await prisma.$queryRaw<Puzzle[]>`
          SELECT *
          FROM "Puzzle"
          WHERE "rating" >= ${minElo} AND "rating" <= ${maxElo}
            ${themeClauseFallback}
          OFFSET ${randOffset}
          LIMIT ${count};
        `;
      } catch {}
    }

    // 4. Relax theme filter if still empty
    if ((!puzzles || puzzles.length === 0) && rawThemes.length > 0) {
      try {
        puzzles = await prisma.$queryRaw<Puzzle[]>`
          SELECT *
          FROM "Puzzle" TABLESAMPLE BERNOULLI (0.5)
          WHERE "rating" >= ${minElo} AND "rating" <= ${maxElo}
          LIMIT ${count};
        `;
      } catch {}
    }

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
