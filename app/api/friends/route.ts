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

    // 1. Fetch established friendships
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
            skillTier: true,
            plan: true,
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
            skillTier: true,
            plan: true,
          },
        },
      },
    });

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
        skillTier: string | null;
        plan: string | null;
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

    // 2. Fetch incoming pending friend requests (target is current user)
    const incomingRequestsRaw = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            elo: true,
            streak: true,
            peakElo: true,
            skillTier: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const incomingRequests = incomingRequestsRaw.map((req) => ({
      id: req.id,
      senderId: req.senderId,
      receiverId: req.receiverId,
      status: req.status,
      createdAt: req.createdAt,
      sender: req.sender,
    }));

    // 3. Fetch outgoing pending friend requests (sent by current user)
    const outgoingRequestsRaw = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "pending",
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            elo: true,
            streak: true,
            peakElo: true,
            skillTier: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const outgoingRequests = outgoingRequestsRaw.map((req) => ({
      id: req.id,
      senderId: req.senderId,
      receiverId: req.receiverId,
      status: req.status,
      createdAt: req.createdAt,
      receiver: req.receiver,
    }));

    return NextResponse.json({
      friends,
      incomingRequests,
      outgoingRequests,
      incomingCount: incomingRequests.length,
    });
  } catch (error) {
    console.error("Failed to fetch friends and requests:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendUsername, targetUsername } = body;
    const requestedUsername = (targetUsername || friendUsername || "").trim();

    if (!userId || !requestedUsername) {
      return NextResponse.json(
        { error: "userId and username are required." },
        { status: 400 }
      );
    }

    const cleanUsername = requestedUsername.toLowerCase().replace(/^@/, "");

    // 1. Look up sender
    const sender = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "Current user account not found." },
        { status: 404 }
      );
    }

    // 2. Look up receiver by username or email prefix
    const receiver = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: `${cleanUsername}@doomchess.local` },
        ],
      },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: `No player found with username "@${cleanUsername}".` },
        { status: 404 }
      );
    }

    if (receiver.id === sender.id) {
      return NextResponse.json(
        { error: "You cannot send a friend request to yourself." },
        { status: 400 }
      );
    }

    // 3. Check if already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: sender.id, friendId: receiver.id },
          { userId: receiver.id, friendId: sender.id },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json(
        { error: `You are already friends with @${receiver.username || cleanUsername}.` },
        { status: 409 }
      );
    }

    // 4. Check if target user already sent a pending request to us -> Auto-accept!
    const inversePending = await prisma.friendRequest.findFirst({
      where: {
        senderId: receiver.id,
        receiverId: sender.id,
        status: "pending",
      },
    });

    if (inversePending) {
      // Mark inverse request as accepted
      await prisma.friendRequest.update({
        where: { id: inversePending.id },
        data: { status: "accepted" },
      });

      // Upsert bidirectional friendship
      await prisma.friendship.upsert({
        where: {
          userId_friendId: {
            userId: sender.id,
            friendId: receiver.id,
          },
        },
        create: {
          userId: sender.id,
          friendId: receiver.id,
        },
        update: {},
      });

      await prisma.friendship.upsert({
        where: {
          userId_friendId: {
            userId: receiver.id,
            friendId: sender.id,
          },
        },
        create: {
          userId: receiver.id,
          friendId: sender.id,
        },
        update: {},
      });

      return NextResponse.json({
        success: true,
        autoAccepted: true,
        message: `Mutual request! You and @${receiver.username || cleanUsername} are now friends.`,
        friend: {
          id: receiver.id,
          username: receiver.username,
          displayName: receiver.displayName,
          avatar: receiver.avatar,
          elo: receiver.elo,
          streak: receiver.streak,
          peakElo: receiver.peakElo,
          skillTier: receiver.skillTier,
          plan: receiver.plan,
        },
      });
    }

    // 5. Check if pending request from sender already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        senderId: sender.id,
        receiverId: receiver.id,
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { error: `Friend request already sent to @${receiver.username || cleanUsername}.` },
          { status: 409 }
        );
      }
      if (existingRequest.status === "accepted") {
        return NextResponse.json(
          { error: `You are already friends with @${receiver.username || cleanUsername}.` },
          { status: 409 }
        );
      }

      // If previously declined, reset to pending
      const updated = await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: { status: "pending", updatedAt: new Date() },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              elo: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Request sent to @${receiver.username || cleanUsername}`,
        request: updated,
      });
    }

    // 6. Create new pending FriendRequest
    const newRequest = await prisma.friendRequest.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        status: "pending",
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            elo: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Request sent to @${receiver.username || cleanUsername}`,
      request: newRequest,
    });
  } catch (error) {
    console.error("Failed to send friend request:", error);
    return NextResponse.json(
      { error: "Failed to send friend request." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, userId, action } = body;

    if (!requestId || !userId || !action) {
      return NextResponse.json(
        { error: "requestId, userId, and action are required." },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { error: "action must be either 'accept' or 'decline'." },
        { status: 400 }
      );
    }

    // Find the request
    const friendReq = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!friendReq) {
      return NextResponse.json(
        { error: "Friend request not found." },
        { status: 404 }
      );
    }

    // Only the receiver can accept or decline
    if (friendReq.receiverId !== userId) {
      return NextResponse.json(
        { error: "You are not authorized to respond to this request." },
        { status: 403 }
      );
    }

    if (action === "accept") {
      // 1. Update request status to accepted
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted", updatedAt: new Date() },
      });

      // 2. Upsert bidirectional friendships
      await prisma.friendship.upsert({
        where: {
          userId_friendId: {
            userId: friendReq.senderId,
            friendId: friendReq.receiverId,
          },
        },
        create: {
          userId: friendReq.senderId,
          friendId: friendReq.receiverId,
        },
        update: {},
      });

      await prisma.friendship.upsert({
        where: {
          userId_friendId: {
            userId: friendReq.receiverId,
            friendId: friendReq.senderId,
          },
        },
        create: {
          userId: friendReq.receiverId,
          friendId: friendReq.senderId,
        },
        update: {},
      });

      return NextResponse.json({
        success: true,
        status: "accepted",
        message: `Accepted request from @${friendReq.sender.username || "player"}.`,
        friend: {
          id: friendReq.sender.id,
          username: friendReq.sender.username,
          displayName: friendReq.sender.displayName,
          avatar: friendReq.sender.avatar,
          elo: friendReq.sender.elo,
          streak: friendReq.sender.streak,
          peakElo: friendReq.sender.peakElo,
          skillTier: friendReq.sender.skillTier,
          plan: friendReq.sender.plan,
        },
      });
    } else {
      // Decline: delete request or update to declined
      await prisma.friendRequest.delete({
        where: { id: requestId },
      });

      return NextResponse.json({
        success: true,
        status: "declined",
        message: `Declined request from @${friendReq.sender.username || "player"}.`,
      });
    }
  } catch (error) {
    console.error("Failed to respond to friend request:", error);
    return NextResponse.json(
      { error: "Failed to respond to friend request." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId, requestId } = body;

    // Support cancelling an outgoing pending request by requestId
    if (requestId && userId) {
      const targetReq = await prisma.friendRequest.findFirst({
        where: { id: requestId, senderId: userId },
      });
      if (targetReq) {
        await prisma.friendRequest.delete({ where: { id: requestId } });
        return NextResponse.json({
          success: true,
          message: "Request cancelled.",
        });
      }
    }

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: "userId and friendId are required." },
        { status: 400 }
      );
    }

    // Delete friendships
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    // Clean up any accepted request between them
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    return NextResponse.json({ success: true, message: "Friend removed." });
  } catch (error) {
    console.error("Failed to remove friend:", error);
    return NextResponse.json(
      { error: "Failed to remove friend." },
      { status: 500 }
    );
  }
}
