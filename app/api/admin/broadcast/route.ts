import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry } from "@/lib/prisma";

function parseSender(senderStr: string) {
  const match = senderStr.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "DoomChess", email: "updates@doomchess.online" };
}

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.ADMIN_BROADCAST_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const count = await withDbRetry(() =>
      prisma.user.count({
        where: {
          email: { not: null },
          emailSubscribed: true,
          OR: [
            { emailVerified: { not: null } },
            { googleId: { not: null } },
          ],
        },
      })
    );

    return NextResponse.json({
      success: true,
      recipientCount: count,
    });
  } catch (err: any) {
    console.error("[/api/admin/broadcast GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch recipient count." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "BREVO_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { templateId, subject, htmlBody, params } = body;

    const hasTemplate = templateId !== undefined && templateId !== null && String(templateId).trim() !== "";
    const hasCustom = htmlBody && typeof htmlBody === "string" && htmlBody.trim() !== "";

    if (!hasTemplate && !hasCustom) {
      return NextResponse.json(
        { error: "Please provide either a Brevo templateId or an htmlBody with subject." },
        { status: 400 }
      );
    }

    if (!hasTemplate && (!subject || typeof subject !== "string" || !subject.trim())) {
      return NextResponse.json(
        { error: "Subject is required when sending custom htmlBody." },
        { status: 400 }
      );
    }

    // Fetch verified, subscribed users (including OAuth users)
    const recipients = await withDbRetry(() =>
      prisma.user.findMany({
        where: {
          email: { not: null },
          emailSubscribed: true,
          OR: [
            { emailVerified: { not: null } },
            { googleId: { not: null } },
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
        },
      })
    );

    const validRecipients = recipients.filter(
      (r): r is { id: string; email: string; username: string | null; displayName: string | null } =>
        Boolean(r.email && r.email.includes("@"))
    );

    if (validRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        totalRecipients: 0,
        deliveredCount: 0,
        message: "No verified subscribed recipients found.",
      });
    }

    const senderObj = parseSender(
      process.env.BREVO_PROMO_SENDER || "DoomChess <updates@doomchess.online>"
    );

    let deliveredCount = 0;
    const CHUNK_SIZE = 35;

    for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
      const chunk = validRecipients.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (user) => {
          try {
            const userEmail = user.email.trim();
            const userName = user.displayName || user.username || "Player";
            const unsubUrl = `https://doomchess.online/api/user/unsubscribe?email=${encodeURIComponent(userEmail)}`;

            let payload: Record<string, any>;

            if (hasTemplate) {
              payload = {
                templateId: Number(templateId),
                to: [{ email: userEmail, name: userName }],
                params: {
                  USERNAME: userName,
                  EMAIL: userEmail,
                  UNSUBSCRIBE_URL: unsubUrl,
                  ...(params || {}),
                },
              };
            } else {
              const personalContent = htmlBody
                .replace(/\{\{USERNAME\}\}/g, userName)
                .replace(/\{\{EMAIL\}\}/g, userEmail);

              const wrappedHtml = `
                <div style="background-color: #0a0908; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; text-align: left;">
                  <div style="max-width: 540px; margin: 0 auto; background: #12100e; border: 1px solid rgba(194, 155, 120, 0.2); border-radius: 12px; padding: 32px;">
                    <h1 style="color: #c29b78; font-size: 20px; font-weight: bold; margin-bottom: 20px; letter-spacing: 0.5px;">DoomChess</h1>
                    <div style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                      ${personalContent}
                    </div>
                    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #71717a; text-align: center;">
                      <p style="margin-bottom: 8px;">You received this email because you have an account on DoomChess.</p>
                      <a href="${unsubUrl}" style="color: #c29b78; text-decoration: underline;">Unsubscribe from announcements</a>
                    </div>
                  </div>
                </div>
              `;

              payload = {
                sender: senderObj,
                to: [{ email: userEmail, name: userName }],
                subject: subject.trim(),
                htmlContent: wrappedHtml,
              };
            }

            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              deliveredCount++;
            } else {
              const errBody = await res.text();
              console.warn(`[BROADCAST] Brevo delivery error for ${userEmail}:`, res.status, errBody);
            }
          } catch (err) {
            console.error(`[BROADCAST] Exception sending to ${user.email}:`, err);
          }
        })
      );

      // Throttling: 300ms pause between chunks of 35
      if (i + CHUNK_SIZE < validRecipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return NextResponse.json({
      success: true,
      totalRecipients: validRecipients.length,
      deliveredCount,
    });
  } catch (error: any) {
    console.error("[/api/admin/broadcast POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal broadcast error." },
      { status: 500 }
    );
  }
}

