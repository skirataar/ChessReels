import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { puzzleId, userId, action = "like" } = body;

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      );
    }

    const effectiveUserId = userId || "anonymous-guest";

    if (action === "unlike") {
      // Delete like record if exists
      try {
        await prisma.puzzleLike.delete({
          where: {
            puzzleId_userId: {
              puzzleId,
              userId: effectiveUserId,
            },
          },
        });
      } catch {
        // Record might not exist, proceed
      }

      // Decrement puzzle likes safely
      const updatedPuzzle = await prisma.puzzle.update({
        where: { id: puzzleId },
        data: {
          likes: {
            decrement: 1,
          },
        },
        select: { likes: true },
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        hasLiked: false,
        likes: Math.max(0, updatedPuzzle?.likes ?? 0),
      });
    }

    // Otherwise, add like
    let isNewLike = false;
    try {
      await prisma.puzzleLike.create({
        data: {
          puzzleId,
          userId: effectiveUserId,
        },
      });
      isNewLike = true;
    } catch {
      // Already liked by this user
      isNewLike = false;
    }

    let likesCount = 1;
    if (isNewLike) {
      const updated = await prisma.puzzle.update({
        where: { id: puzzleId },
        data: {
          likes: {
            increment: 1,
          },
        },
        select: { likes: true },
      }).catch(() => null);
      likesCount = updated?.likes ?? 1;
    } else {
      const existing = await prisma.puzzle.findUnique({
        where: { id: puzzleId },
        select: { likes: true },
      });
      likesCount = existing?.likes ?? 1;
    }

    return NextResponse.json({
      success: true,
      hasLiked: true,
      likes: Math.max(1, likesCount),
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Failed to update like status" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const puzzleId = searchParams.get("puzzleId");
    const userId = searchParams.get("userId") || "anonymous-guest";

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      );
    }

    const [puzzle, userLike] = await Promise.all([
      prisma.puzzle.findUnique({
        where: { id: puzzleId },
        select: { likes: true },
      }),
      prisma.puzzleLike.findUnique({
        where: {
          puzzleId_userId: {
            puzzleId,
            userId,
          },
        },
      }),
    ]);

    return NextResponse.json({
      likes: puzzle?.likes ?? 0,
      hasLiked: Boolean(userLike),
    });
  } catch (error) {
    console.error("Error fetching puzzle likes:", error);
    return NextResponse.json(
      { error: "Failed to fetch like status" },
      { status: 500 }
    );
  }
}
