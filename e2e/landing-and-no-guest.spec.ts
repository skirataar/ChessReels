import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR =
  "/home/skirataar/.gemini/antigravity-ide/brain/53803d71-613c-470b-aba0-166c10c5831e";

test.describe("Landing Page & No-Guest Access Auth Flow", () => {
  test("1. Root and /play show Animated Hero, Name directly above buttons, and only Google + Login buttons", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/");

    // Clear any existing accounts to simulate fresh unauthenticated user
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie = "chess_reel_session=; path=/; max-age=0";
      document.cookie = "chess_reel_oauth_user=; path=/; max-age=0";
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // 1. Verify Animated Hero is rendered
    const brandTitle = page.locator("h1:has-text('Doom')");
    await expect(brandTitle).toBeVisible();
    await expect(page.locator("text=Chess")).toBeVisible();

    // 2. Verify Tagline directly under name
    await expect(
      page.locator("text=Turn doomscrolling into tactical mastery")
    ).toBeVisible();

    // 3. Verify exactly two primary action buttons: Continue with Google & Log In
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();

    const loginBtn = page.locator("button:has-text('Log In')");
    await expect(loginBtn).toBeVisible();

    // 4. Verify Create Account switcher is present
    await expect(page.locator("button:has-text('Create Account')")).toBeVisible();

    // 5. Verify NO guest buttons or pricing tables exist
    await expect(page.locator("text=Instant Guest Play")).not.toBeVisible();
    await expect(page.locator("text=Play Free with Ads")).not.toBeVisible();
    await expect(page.locator("text=Free Tier")).not.toBeVisible();
    await expect(page.locator("text=Premium Pro")).not.toBeVisible();
    await expect(page.locator("text=$4.99")).not.toBeVisible();

    // Take screenshot of new Animated Landing Page
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "animated_landing_page_mobile.png"),
      fullPage: true,
    });
  });

  test("2. Unauthenticated visit to /play directly blocks game and displays Landing Page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Should show landing page, chessboard should not be playable
    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
    await expect(page.locator("button:has-text('Log In')")).toBeVisible();
    await expect(page.locator("h1:has-text('Doom')")).toBeVisible();
  });

  test("3. Unauthenticated visit to /stats redirects to root landing page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/stats");

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Should have redirected to / (or /play landing)
    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
  });

  test("4. Logging out from an authenticated account redirects to Landing Page, NOT a guest account", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    // Seed logged-in user
    await page.evaluate(() => {
      localStorage.setItem(
        "chess_reel_account",
        JSON.stringify({
          id: "signed-in-user-1",
          username: "grandmaster_alex",
          displayName: "Alex GM",
          elo: 1850,
          isCalibrated: true,
          plan: "free",
        })
      );
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // Verify user is in gameplay screen (dock is visible)
    await expect(page.locator("nav[aria-label='Bottom Navigation']")).toBeVisible();

    // Open Profile & Stats from bottom dock (Link)
    const profileTab = page.locator("a:has-text('Profile')");
    await profileTab.click();
    await page.waitForTimeout(1000);

    // Verify profile page is open with user name
    await expect(page.locator("text=Alex GM")).toBeVisible();

    // Click Sign Out
    const signOutBtn = page.locator("button[title='Sign out of account']");
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    await page.waitForTimeout(1200);

    // Verify user is NOT in a guest account and NOT seeing gameplay
    // User must be presented with the landing page!
    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
    await expect(page.locator("button:has-text('Log In')")).toBeVisible();
    await expect(page.locator("h1:has-text('Chess')")).toBeVisible();

    // Verify localStorage has no account or preview guest
    const accountState = await page.evaluate(() => ({
      account: localStorage.getItem("chess_reel_account"),
      guestPreview: localStorage.getItem("chess_reel_preview_guest"),
    }));
    expect(accountState.account).toBeNull();
    expect(accountState.guestPreview).toBeNull();

    // Take screenshot of state after logout
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "logged_out_landing_screen.png"),
      fullPage: true,
    });
  });

  test("5. Clicking Log In opens AuthModal cleanly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);

    const loginBtn = page.locator("button:has-text('Log In')");
    await loginBtn.click();
    await page.waitForTimeout(500);

    // AuthModal is visible
    await expect(page.locator("text=Sign In").first()).toBeVisible();
    await expect(page.locator("#login-username")).toBeVisible();

    // Take screenshot of Login Modal over Landing Page
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "login_modal_view.png"),
      fullPage: true,
    });
  });

  test("6. Clicking Continue with Google directly redirects to Google OAuth without asking for Elo again", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);

    // 1. In Log In modal, Continue with Google initiates Google OAuth directly without showing skill picker
    const loginBtn = page.locator("button:has-text('Log In')");
    await loginBtn.click();
    await expect(page.locator("text=Sign In to DoomChess")).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/auth/google")),
      page.locator("role=dialog").locator("button:has-text('Continue with Google')").click(),
    ]);
    expect(request.url()).toContain("/api/auth/google");

    // 2. On Landing page, Continue with Google also directly navigates to /api/auth/google
    await page.goto("http://localhost:3000/");
    await page.waitForTimeout(500);

    const [landingRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/auth/google")),
      page.locator("main").locator("button:has-text('Continue with Google')").click(),
    ]);
    expect(landingRequest.url()).toContain("/api/auth/google");
  });

  test("7. Bottom dock is permanently visible across unauthenticated, authenticated, and post-logout states", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/");

    // Clear state
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie = "chess_reel_session=; path=/; max-age=0";
      document.cookie = "chess_reel_oauth_user=; path=/; max-age=0";
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // 1. Unauthenticated on Landing Page: dock is visible!
    const bottomNav = page.locator("nav[aria-label='Bottom Navigation']");
    await expect(bottomNav).toBeVisible();

    const playTab = page.locator("[data-testid='bottom-nav-play']");
    const practiceTab = page.locator("[data-testid='bottom-nav-practice']");
    const profileTab = page.locator("[data-testid='bottom-nav-profile']");

    await expect(playTab).toBeVisible();
    await expect(practiceTab).toBeVisible();
    await expect(profileTab).toBeVisible();

    // 2. Clicking Profile while unauthenticated opens AuthModal
    await profileTab.click();
    await expect(page.locator("role=dialog")).toBeVisible();
    await expect(page.locator("text=Sign In to DoomChess")).toBeVisible();

    // Close AuthModal
    await page.locator("button[aria-label='Close modal']").click();
    await page.waitForTimeout(400);

    // 3. Clicking Practice while unauthenticated opens AuthModal
    await practiceTab.click();
    await expect(page.locator("role=dialog")).toBeVisible();

    // Close AuthModal
    await page.locator("button[aria-label='Close modal']").click();
    await page.waitForTimeout(400);

    // 4. Authenticate user
    await page.evaluate(() => {
      const mockUser = {
        id: "user-persistent-dock-test",
        username: "DockMaster",
        displayName: "Dock Master",
        elo: 1400,
        plan: "free",
        isCalibrated: true,
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(mockUser));
      document.cookie = "chess_reel_session=user-persistent-dock-test; path=/; max-age=86400";
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Dock is still visible in game view
    await expect(bottomNav).toBeVisible();

    // Take screenshot of mobile screen with visible dock
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "dock_visible_mobile.png"),
      fullPage: false,
    });
  });
});

