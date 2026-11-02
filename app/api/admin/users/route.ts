import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { REGISTERED_USER_WHERE_CLAUSE } from "@/lib/communitySeed";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const plan = searchParams.get("plan");
    const filter = searchParams.get("filter") || "registered"; // "registered" | "all" | "pro"
    const sortBy = searchParams.get("sortBy") || "elo"; // "elo" | "streak" | "createdAt"
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

    // Filter strictly to registered users by default (unless "all" is explicitly passed)
    if (filter !== "all") {
      andConditions.push(REGISTERED_USER_WHERE_CLAUSE);
    }

    if (search) {
      andConditions.push({
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (plan && plan !== "all") {
      andConditions.push({ plan });
    } else if (filter === "pro") {
      andConditions.push({ plan: "premium" });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const orderBy: any = {};
    if (sortBy === "streak") {
      orderBy.streak = order;
    } else if (sortBy === "createdAt") {
      orderBy.createdAt = order;
    } else {
      orderBy.elo = order;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatar: true,
          elo: true,
          peakElo: true,
          streak: true,
          bestStreak: true,
          isCalibrated: true,
          calibrationStep: true,
          plan: true,
          googleId: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin user list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user list" },
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
    const { userId, plan, elo, isCalibrated, streak } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required for update" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (plan !== undefined) updateData.plan = plan === "premium" ? "premium" : "free";
    if (elo !== undefined) {
      const parsedElo = parseInt(elo, 10);
      if (!isNaN(parsedElo)) {
        updateData.elo = parsedElo;
        updateData.peakElo = Math.max(parsedElo, 800);
      }
    }
    if (isCalibrated !== undefined) updateData.isCalibrated = Boolean(isCalibrated);
    if (streak !== undefined) updateData.streak = parseInt(streak, 10) || 0;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        elo: true,
        peakElo: true,
        streak: true,
        plan: true,
        isCalibrated: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updated.username || updated.id} updated successfully`,
      user: updated,
    });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `User ${userId} deleted successfully`,
    });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
