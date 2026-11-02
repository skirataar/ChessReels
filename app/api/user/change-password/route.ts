import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const body = await request.json();
    const { userId: bodyUserId, currentPassword, newPassword } = body;

    const targetUserId = sessionCookie || bodyUserId;

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Authentication required to change password." },
        { status: 401 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // If user already has a password, verify current password
    if (user.passwordHash) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return NextResponse.json(
          { error: "Current password is required." },
          { status: 400 }
        );
      }

      const isValid = verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password does not match our records." },
          { status: 400 }
        );
      }
    }

    // Hash and store the new password
    const newHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
