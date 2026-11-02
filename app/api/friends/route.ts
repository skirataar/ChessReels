import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter required." },
        { status: 400 }
      );
    }

    // Find friendships where user is initiator or recipient
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            elo: true,
            streak: true,
            peakElo: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            elo: true,
            streak: true,
            peakElo: true,
          },
        },
      },
    });

    // Map to list of distinct friend objects
    const friendMap = new Map<
      string,
      {
        id: string;
        username: string | null;
        displayName: string | null;
        avatar: string | null;
        elo: number;
        streak: number;
        peakElo: number;
      }
    >();

    for (const f of friendships) {
      const other: (typeof f)["user"] = f.userId === userId ? f.friend : f.user;
      if (other && other.id !== userId) {
        friendMap.set(other.id, other);
      }
    }

    const friends = Array.from(friendMap.values()).sort(
      (a, b) => b.elo - a.elo
    );

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Failed to fetch friends:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendUsername } = body;

    if (!userId || !friendUsername) {
      return NextResponse.json(
        { error: "userId and friendUsername are required." },
        { status: 400 }
      );
    }

    const cleanFriendUsername = friendUsername.trim().toLowerCase();

    // Look up the user by userId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Current user account not found." },
        { status: 404 }
      );
    }

    // Look up target friend by username
    const targetFriend = await prisma.user.findUnique({
      where: { username: cleanFriendUsername },
    });

    if (!targetFriend) {
      return NextResponse.json(
        { error: `No player found with username "${cleanFriendUsername}".` },
        { status: 404 }
      );
    }

    if (targetFriend.id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot add yourself as a friend." },
        { status: 400 }
      );
    }

    // Check if already friends
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUser.id, friendId: targetFriend.id },
          { userId: targetFriend.id, friendId: currentUser.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `You are already friends with ${targetFriend.displayName || targetFriend.username}.` },
        { status: 409 }
      );
    }

    // Create bidirectional friendship record
    const friendship = await prisma.friendship.create({
      data: {
        userId: currentUser.id,
        friendId: targetFriend.id,
      },
    });

    return NextResponse.json({
      success: true,
      friendshipId: friendship.id,
      friend: {
        id: targetFriend.id,
        username: targetFriend.username,
        displayName: targetFriend.displayName,
        avatar: targetFriend.avatar,
        elo: targetFriend.elo,
        streak: targetFriend.streak,
        peakElo: targetFriend.peakElo,
      },
    });
  } catch (error) {
    console.error("Failed to add friend:", error);
    return NextResponse.json(
      { error: "Failed to add friend." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId } = body;

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: "userId and friendId are required." },
        { status: 400 }
      );
    }

    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove friend:", error);
    return NextResponse.json(
      { error: "Failed to remove friend." },
      { status: 500 }
    );
  }
}
