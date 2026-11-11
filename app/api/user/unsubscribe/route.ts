import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawEmail = searchParams.get("email");

    if (rawEmail && typeof rawEmail === "string") {
      const cleanEmail = rawEmail.trim().toLowerCase();
      try {
        await withDbRetry(() =>
          prisma.user.updateMany({
            where: {
              email: { equals: cleanEmail, mode: "insensitive" },
            },
            data: {
              emailSubscribed: false,
            },
          })
        );
      } catch (err) {
        console.error("[/api/user/unsubscribe] DB update error:", err);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed | DoomChess</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0a0908;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #12100e;
      border: 1px solid rgba(194, 155, 120, 0.25);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 40px rgba(194, 155, 120, 0.05);
    }
    .icon-wrapper {
      width: 52px;
      height: 52px;
      margin: 0 auto 20px auto;
      border-radius: 16px;
      background: rgba(194, 155, 120, 0.12);
      border: 1px solid rgba(194, 155, 120, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c29b78;
    }
    h1 {
      color: #f5f2eb;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    p.description {
      color: #d4d4d8;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    p.subtext {
      color: #71717a;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 13px 20px;
      background: #c29b78;
      color: #0a0908;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-decoration: none;
      border-radius: 12px;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .btn:hover {
      background: #d4b08f;
    }
    .btn:active {
      transform: scale(0.98);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    </div>
    <h1>Subscription Updated</h1>
    <p class="description">You have successfully unsubscribed from DoomChess updates.</p>
    <p class="subtext">You will no longer receive announcements or promotional emails. Critical account security notices will still be delivered when requested.</p>
    <a href="/play" class="btn">Return to DoomChess</a>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("[/api/user/unsubscribe GET] Error:", error);
    return new NextResponse("An error occurred. Please try again later.", {
      status: 500,
    });
  }
}

