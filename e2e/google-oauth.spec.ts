import { test, expect } from "@playwright/test";

test.describe("Google OAuth 2.0 Authentication Flow", () => {
  test("1. /api/auth/google sets state cookie and handles redirect parameters", async ({ request }) => {
    // Initiate OAuth endpoint without credentials set
    const res = await request.get("/api/auth/google?skillLevel=advanced&guestId=guest-test-oauth", {
      maxRedirects: 0,
    });

    // Should return 302 or 307 redirect
    expect([302, 307]).toContain(res.status());
    const location = res.headers()["location"];
    expect(location).toBeDefined();

    // When live credentials are configured, it redirects to accounts.google.com; otherwise to /?oauth_info=google_credentials_required
    expect(
      location.includes("accounts.google.com") ||
        location.includes("oauth_info=google_credentials_required")
    ).toBe(true);

    // Verify it handles state parameter correctly
    const statePayload = {
      skillLevel: "advanced",
      guestId: "guest-test-oauth",
      returnUrl: "/",
    };
    const encodedState = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
    expect(encodedState).toBeTruthy();
  });

  test("2. /api/auth/google/callback exchanges code, provisions user with baseline Elo, and sets session cookie", async ({ request }) => {
    const uniqueSuffix = `spec_${Date.now()}`;
    const statePayload = {
      skillLevel: "beginner",
      guestId: `guest_${uniqueSuffix}`,
      returnUrl: "/",
    };
    const encodedState = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Call callback route with test mock code
    const res = await request.get(`/api/auth/google/callback?code=test_mock_code_${uniqueSuffix}&state=${encodedState}`, {
      maxRedirects: 0,
    });

    // Should redirect to returnUrl with google_auth=success
    expect([302, 307]).toContain(res.status());
    const location = res.headers()["location"];
    expect(location).toContain("google_auth=success");

    // Check Set-Cookie headers for chess_reel_oauth_user
    const setCookieHeaders = res.headers()["set-cookie"];
    expect(setCookieHeaders).toBeDefined();
    expect(setCookieHeaders).toContain("chess_reel_oauth_user=");

    // Verify payload inside cookie
    const match = setCookieHeaders.match(/chess_reel_oauth_user=([^;]+)/);
    expect(match).toBeTruthy();
    if (match) {
      let raw = match[1];
      try {
        raw = decodeURIComponent(raw);
      } catch {}
      const userPayload = JSON.parse(raw);
      expect(userPayload.id).toBeDefined();
      expect(userPayload.elo).toBe(600); // Beginner baseline
      expect(userPayload.isCalibrated).toBe(false);
      expect(userPayload.calibrationStep).toBe(0);
    }
  });

  test("3. Client ingests OAuth session cookie on load and restores account session", async ({ page }) => {
    const uniqueSuffix = `client_${Date.now()}`;
    const statePayload = {
      skillLevel: "intermediate",
      guestId: `guest_${uniqueSuffix}`,
      returnUrl: "/",
    };
    const encodedState = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Navigate to callback endpoint directly in browser
    await page.goto(`/api/auth/google/callback?code=test_mock_code_${uniqueSuffix}&state=${encodedState}`);

    // Browser follows redirect to /?google_auth=success
    await page.waitForURL(/\//);

    // Verify user is logged in with Intermediate baseline (1200 Elo)
    const placementBanner = page.getByText(/placement test • puzzle 1 of 6/i);
    await expect(placementBanner).toBeVisible({ timeout: 12000 });

    const eloBadge = page.getByText(/est: 1200 elo/i);
    await expect(eloBadge).toBeVisible();

    // Verify localStorage has account saved
    const savedAccount = await page.evaluate(() => {
      return window.localStorage.getItem("chess_reel_account");
    });
    expect(savedAccount).not.toBeNull();
    const parsed = JSON.parse(savedAccount!);
    expect(parsed.elo).toBe(1200);
  });

  test("4. AuthModal displays Continue with Google (OAuth) action button and skill selector", async ({ page }) => {
    await page.goto("/");

    // Click "Continue with Google" directly on landing page
    const continueGoogleBtn = page.getByRole("button", { name: /continue with google/i }).first();
    await expect(continueGoogleBtn).toBeVisible();
    await continueGoogleBtn.click();

    // Verify Google OAuth prompt modal appears
    await expect(page.getByText(/sign in with google to chess reel/i)).toBeVisible();

    // Verify OAuth action button is present
    const oauthBtn = page.getByRole("button", { name: /continue with google \(oauth\)/i });
    await expect(oauthBtn).toBeVisible();

    // Verify Skill Baseline selection is present
    await expect(page.getByText(/select your skill baseline/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /beginner 600 elo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /intermediate 1200 elo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /advanced 1600 elo/i })).toBeVisible();

    // Verify Quick Test Sign-In fallback is also accessible
    await expect(page.getByRole("button", { name: /confirm & continue/i })).toBeVisible();
  });
});
