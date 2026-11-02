import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminSecret,
  createAdminToken,
  isAdminAuthenticated,
} from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body;

    if (!secretKey || !verifyAdminSecret(secretKey)) {
      return NextResponse.json(
        { error: "Invalid admin master key. Access denied." },
        { status: 401 }
      );
    }

    const token = createAdminToken();
    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful",
      token,
    });

    response.cookies.set("chess_reel_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const isAuth = isAdminAuthenticated(request);
  return NextResponse.json({ authenticated: isAuth });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out from admin console",
  });
  response.cookies.set("chess_reel_admin_token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
