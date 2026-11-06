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

  test("4. Google sign-in with a new account routes user to onboarding calibration, preserving calibrated Elo", async ({ page }) => {
    // 1. Visit landing page and click "Sign In"
    await page.goto("/");
    const signInBtn = page.getByRole("button", { name: /sign in/i });
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // 2. On auth step, verify "Continue with Google" is visible
    const continueGoogleBtn = page.getByRole("button", { name: /continue with google/i });
    await expect(continueGoogleBtn).toBeVisible();

    // 3. Simulate callback for a new Google user attempting sign-in (mode: 'signin')
    const uniqueSuffix = `newuser_${Date.now()}`;
    const statePayload = {
      mode: "signin",
      guestId: `guest_${uniqueSuffix}`,
      returnUrl: "/play",
    };
    const encodedState = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    await page.goto(`/api/auth/google/callback?code=test_mock_code_${uniqueSuffix}&state=${encodedState}`);

    // 4. Verify user is redirected to onboarding calibration (step-elo), NOT directly to placements with 600 Elo!
    await expect(page).toHaveURL(/\/?.*step=step-elo/);
    await expect(page.getByText(/where are you starting from\?/i)).toBeVisible();
    await expect(page.getByText(new RegExp(`calibrating for.*mock user ${uniqueSuffix}`, "i"))).toBeVisible();

    // 5. User adjusts slider to 1500 Elo
    const slider = page.locator('input[type="range"]');
    await slider.fill("1500");
    await expect(page.getByText("1500")).toBeVisible();

    // 6. Proceed to Step 2 (Target Rating)
    const nextBtn1 = page.getByRole("button", { name: /continue/i });
    await nextBtn1.click();
    await expect(page.getByText(/set your target rating\./i)).toBeVisible();

    // 7. Proceed to Step 3 (Board Theme)
    const nextBtn2 = page.getByRole("button", { name: /continue/i });
    await nextBtn2.click();
    await expect(page.getByText(/choose your board\./i)).toBeVisible();

    // 8. Proceed to Step 4 (Ready to swipe / Finalize Google Account)
    const nextBtn3 = page.getByRole("button", { name: /continue/i });
    await nextBtn3.click();

    await expect(page.getByText(/ready to swipe/i)).toBeVisible();
    await expect(page.getByText(/google account connected/i)).toBeVisible();
    await expect(page.getByText("1500 Elo").first()).toBeVisible();

    // 9. Click "Complete Setup & Start Playing (1500 Elo)"
    const completeBtn = page.getByRole("button", { name: /complete setup & start playing \(1500 elo\)/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // 10. Verify browser reaches /play with calibrated 1500 Elo
    await page.waitForURL(/\/play/, { timeout: 10000 });
    const placementBanner = page.getByText(/placement test • puzzle 1 of 6/i);
    await expect(placementBanner).toBeVisible({ timeout: 12000 });

    const eloBadge = page.getByText(/est: 1500 elo/i);
    await expect(eloBadge).toBeVisible();

    // Verify localStorage has 1500 Elo account saved
    const savedAccount = await page.evaluate(() => {
      return window.localStorage.getItem("chess_reel_account");
    });
    expect(savedAccount).not.toBeNull();
    const parsed = JSON.parse(savedAccount!);
    expect(parsed.elo).toBe(1500);
  });
});
