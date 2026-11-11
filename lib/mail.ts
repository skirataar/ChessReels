/**
 * Centralized transactional email helper using Brevo v3 REST API.
 */

export async function sendSecurityOtpEmail(
  toEmail: string,
  code: string,
  type: "VERIFY_EMAIL" | "2FA"
): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  if (!apiKey) {
    console.warn(`[MAIL] BREVO_API_KEY missing. ${type} OTP for ${toEmail}:`, code);
    return false;
  }

  const isVerify = type === "VERIFY_EMAIL";
  const title = isVerify ? "Confirm Your Email" : "Two-Factor Authentication";
  const description = isVerify
    ? "Welcome to DoomChess. Enter the 6-digit confirmation code below to verify your account."
    : "Enter the 6-digit verification code below to authorize your login.";

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "DoomChess Security", email: "auth@doomchess.online" },
        to: [{ email: toEmail }],
        subject: `${code} is your DoomChess ${isVerify ? "confirmation" : "security"} code`,
        htmlContent: `
          <div style="background-color: #0a0908; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; text-align: center;">
            <div style="max-width: 420px; margin: 0 auto; background: #12100e; border: 1px solid rgba(194, 155, 120, 0.2); border-radius: 16px; padding: 32px;">
              <h2 style="color: #c29b78; margin-bottom: 8px; font-size: 20px;">${title}</h2>
              <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">${description}</p>
              <div style="background: #181512; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${code}</div>
              <p style="color: #71717a; font-size: 12px; margin-top: 24px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`[MAIL] Failed to send ${type} OTP to ${toEmail}:`, err);
    return false;
  }
}

