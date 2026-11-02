import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const minRating = parseInt(searchParams.get("minRating") || "400", 10);
    const maxRating = parseInt(searchParams.get("maxRating") || "3000", 10);
    const theme = searchParams.get("theme")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      rating: {
        gte: minRating,
        lte: maxRating,
      },
    };

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { themes: { contains: search, mode: "insensitive" } },
        { openingTags: { contains: search, mode: "insensitive" } },
      ];
    }

    if (theme) {
      where.themes = { contains: theme, mode: "insensitive" };
    }

    const [total, puzzles] = await Promise.all([
      prisma.puzzle.count({ where }),
      prisma.puzzle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { popularity: "desc" },
      }),
    ]);

    return NextResponse.json({
      puzzles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin puzzle search error:", error);
    return NextResponse.json(
      { error: "Failed to query puzzles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, fen, moves, rating, themes, openingTags, gameUrl } = body;

    if (!fen || !moves || !rating) {
      return NextResponse.json(
        { error: "fen, moves, and rating are required fields" },
        { status: 400 }
      );
    }

    const puzzleId = id?.trim() || `admin_${Date.now()}`;

    const created = await prisma.puzzle.create({
      data: {
        id: puzzleId,
        fen: fen.trim(),
        moves: moves.trim(),
        rating: parseInt(rating, 10),
        ratingDeviation: 75,
        popularity: 100,
        nbPlays: 0,
        themes: themes?.trim() || "custom admin tactics",
        openingTags: openingTags?.trim() || "Custom Position",
        gameUrl: gameUrl?.trim() || "https://lichess.org",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Custom puzzle #${created.id} added successfully`,
      puzzle: created,
    });
  } catch (error) {
    console.error("Admin add puzzle error:", error);
    return NextResponse.json(
      { error: "Failed to add puzzle to database" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId parameter required" },
        { status: 400 }
      );
    }

    await prisma.puzzle.delete({
      where: { id: puzzleId },
    });

    return NextResponse.json({
      success: true,
      message: `Puzzle #${puzzleId} deleted successfully`,
    });
  } catch (error) {
    console.error("Admin delete puzzle error:", error);
    return NextResponse.json(
      { error: "Failed to delete puzzle" },
      { status: 500 }
    );
  }
}
