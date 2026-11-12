import { SeverityNumber } from "@opentelemetry/api-logs";
import { after, NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Puzzle } from "@/lib/generated/prisma/client";
import { posthogLogProvider } from "@/instrumentation";

const posthogPuzzleLogger = posthogLogProvider?.getLogger("chess-reel.puzzle-api");

function emitPuzzleLog(
  body: string,
  attributes: Record<string, boolean | number | string>,
  severityNumber = SeverityNumber.INFO,
) {
  posthogPuzzleLogger?.emit({
    body,
    severityNumber,
    attributes,
  });

  after(() => {
    void posthogLogProvider?.forceFlush().catch(() => {});
  });
}

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
          emitPuzzleLog("Puzzle request fulfilled", {
            "puzzle.request_type": "by_id",
          });
          return NextResponse.json(singlePuzzle);
        }
      } catch (err) {
        console.error("Failed to query puzzle by ID:", err);
      }
    }

    const targetEloParam = searchParams.get("targetElo");
    const eloParam = targetEloParam ?? searchParams.get("elo");
    const minRatingParam = searchParams.get("minRating");
    const maxRatingParam = searchParams.get("maxRating");
    const themesParam = searchParams.get("themes");
    const excludeIdsParam = searchParams.get("excludeIds");

    const elo = eloParam !== null ? Number.parseInt(eloParam, 10) : 800;

    let minElo: number;
    let maxElo: number;

    const isTargetElo = targetEloParam !== null && !Number.isNaN(Number(targetEloParam));
    const targetElo = isTargetElo ? Number.parseInt(targetEloParam!, 10) : elo;

    if (minRatingParam !== null && maxRatingParam !== null) {
      minElo = Math.max(0, Number.parseInt(minRatingParam, 10) || 400);
      maxElo = Math.max(minElo, Number.parseInt(maxRatingParam, 10) || 2800);
    } else if (minRatingParam !== null) {
      minElo = Math.max(0, Number.parseInt(minRatingParam, 10) || 400);
      maxElo = 2800;
    } else if (maxRatingParam !== null) {
      minElo = 0;
      maxElo = Math.max(0, Number.parseInt(maxRatingParam, 10) || 2800);
    } else if (isTargetElo) {
      // Tight ELO window: ±75 ELO
      minElo = Math.max(0, targetElo - 75);
      maxElo = targetElo + 75;
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

    // Parse excludeIds to avoid re-serving history or completed placement puzzles
    const rawExclude = excludeIdsParam
      ? excludeIdsParam
          .split(/[,\s]+/)
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const excludeClause =
      rawExclude.length > 0
        ? Prisma.sql`AND p."id" NOT IN (${Prisma.join(rawExclude)})`
        : Prisma.empty;

    const excludeClauseFallback =
      rawExclude.length > 0
        ? Prisma.sql`AND "id" NOT IN (${Prisma.join(rawExclude)})`
        : Prisma.empty;

    async function queryPuzzles(min: number, max: number): Promise<Puzzle[]> {
      let result: Puzzle[] = [];

      if (userId) {
        // 1. Fast path: Bernoulli sampling on 6.15M dataset (under 150ms)
        try {
          result = await prisma.$queryRaw<Puzzle[]>`
            SELECT p.*
            FROM "Puzzle" AS p TABLESAMPLE BERNOULLI (0.5)
            WHERE p."rating" >= ${min} AND p."rating" <= ${max}
              ${themeClause}
              ${excludeClause}
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
        if (!result || result.length === 0) {
          try {
            const randOffset = Math.floor(Math.random() * 200);
            result = await prisma.$queryRaw<Puzzle[]>`
              SELECT p.*
              FROM "Puzzle" AS p
              WHERE p."rating" >= ${min} AND p."rating" <= ${max}
                ${themeClause}
                ${excludeClause}
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
      if (!result || result.length === 0) {
        try {
          result = await prisma.$queryRaw<Puzzle[]>`
            SELECT *
            FROM "Puzzle" TABLESAMPLE BERNOULLI (0.5)
            WHERE "rating" >= ${min} AND "rating" <= ${max}
              ${themeClauseFallback}
              ${excludeClauseFallback}
            LIMIT ${count};
          `;
        } catch {}
      }

      // 3. Fallback if sample was too sparse
      if (!result || result.length === 0) {
        const randOffset = Math.floor(Math.random() * 200);
        try {
          result = await prisma.$queryRaw<Puzzle[]>`
            SELECT *
            FROM "Puzzle"
            WHERE "rating" >= ${min} AND "rating" <= ${max}
              ${themeClauseFallback}
              ${excludeClauseFallback}
            OFFSET ${randOffset}
            LIMIT ${count};
          `;
        } catch {}
      }

      // 4. Relax theme filter if still empty
      if ((!result || result.length === 0) && rawThemes.length > 0) {
        try {
          result = await prisma.$queryRaw<Puzzle[]>`
            SELECT *
            FROM "Puzzle" TABLESAMPLE BERNOULLI (0.5)
            WHERE "rating" >= ${min} AND "rating" <= ${max}
              ${excludeClauseFallback}
            LIMIT ${count};
          `;
        } catch {}
      }

      return result || [];
    }

    let puzzles: Puzzle[] = await queryPuzzles(minElo, maxElo);

    // If targetElo was passed and tight ±75 returned 0 puzzles, widen search band to ±150
    if (isTargetElo && (!puzzles || puzzles.length === 0)) {
      minElo = Math.max(0, targetElo - 150);
      maxElo = targetElo + 150;
      puzzles = await queryPuzzles(minElo, maxElo);
    }

    if (!puzzles || puzzles.length === 0) {
      emitPuzzleLog("Puzzle request unavailable", {
        "puzzle.request_type": "random",
        "puzzle.personalized": Boolean(userId),
        "puzzle.requested_count": count,
        "puzzle.rating_min": minElo,
        "puzzle.rating_max": maxElo,
      }, SeverityNumber.WARN);
      return NextResponse.json(
        {
          message: `No puzzle found within Elo range [${minElo}, ${maxElo}].`,
        },
        { status: 404 }
      );
    }

    emitPuzzleLog("Puzzle request fulfilled", {
      "puzzle.request_type": "random",
      "puzzle.personalized": Boolean(userId),
      "puzzle.requested_count": count,
      "puzzle.returned_count": puzzles.length,
      "puzzle.target_range": isTargetElo,
    });
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
    emitPuzzleLog("Puzzle request failed", {
      "puzzle.request_type": "random",
      "http.status_code": 500,
    }, SeverityNumber.ERROR);
    return NextResponse.json(
      { error: "Internal server error fetching puzzle" },
      { status: 500 }
    );
  }
}
