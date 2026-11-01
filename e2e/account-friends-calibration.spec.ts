import { test, expect } from "@playwright/test";

test.describe("Landing Page, Skill Gauging, Google Auth & Calibration", () => {
  test("1. Landing page displays account-level Elo guarantee, Google CTA & skill tiers", async ({
    page,
  }) => {
    // Fresh visitor with no account
    await page.goto("/");

    // Verify Landing Page hero headline
    await expect(
      page.getByRole("heading", { name: /master tactics in 30s reels/i })
    ).toBeVisible({ timeout: 10_000 });

    // Verify Account-Level Elo Guarantee is clearly explained
    await expect(
      page.getByText(/account-level elo guarantee/i)
    ).toBeVisible();
    await expect(
      page.getByText(/saved permanently in the cloud/i)
    ).toBeVisible();

    // Verify Continue with Google CTA is prominent
    const googleBtn = page.getByRole("button", { name: /continue with google/i }).first();
    await expect(googleBtn).toBeVisible();

    // Verify Authentic 4x4 board teaser is present
    await expect(page.getByText("Mate in 2")).toBeVisible();
    await expect(page.getByText(/royal fork/i)).toBeVisible();

    // Click "Play guest puzzle without saving" to enter the reel
    const previewBtn = page.getByText(/play guest puzzle without saving/i);
    await previewBtn.click();

    // Verify successfully entered the reels feed
    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(boardContainer).toBeVisible({ timeout: 10_000 });
  });

  test("2. New account gauges Elo from selected skill level (e.g. Advanced -> 1600) and starts placement test", async ({
    page,
  }) => {
    await page.goto("/");

    // Click "Get Started Free" from landing page
    const createBtn = page.getByRole("button", { name: /get started free/i });
    await createBtn.click();

    // Verify Auth Modal opened with Skill Level selection
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    await expect(page.getByText(/choose your skill level/i)).toBeVisible();

    // Select "Advanced" skill tier (1600 base Elo)
    const advancedOption = page.getByRole("button", { name: /advanced 1500\+ elo/i });
    await advancedOption.click();

    // Fill username and submit
    const uniqueUsername = `adv_${Date.now().toString(36)}`;
    await page.fill("#reg-username", uniqueUsername);
    await page.fill("#reg-display", "Grandmaster Mind");

    const submitBtn = page.getByRole("button", { name: /start 6-puzzle placement/i });
    await submitBtn.click();

    // Verify Account created and calibrated at 1600 baseline Elo (not guest Elo 800)
    const placementBanner = page.getByText(/placement test • puzzle 1 of 6/i);
    await expect(placementBanner).toBeVisible({ timeout: 8000 });

    const eloBadge = page.getByText(/est: 1600 elo/i);
    await expect(eloBadge).toBeVisible();

    // Verify HUD rating is 1600
    await expect(page.getByTitle("Your Rating: 1600")).toBeVisible();
  });

  test("3. Google authentication creates account and saves Elo at account level", async ({
    page,
  }) => {
    await page.goto("/");

    // Click "Continue with Google"
    const googleBtn = page.getByRole("button", { name: /continue with google/i }).first();
    await googleBtn.click();

    // Verify Google prompt appears
    await expect(page.getByText(/sign in with google to chess reel/i)).toBeVisible();

    const uniqueEmail = `test.chess.${Date.now()}@gmail.com`;
    await page.fill('input[type="email"]', uniqueEmail);

    // Select Beginner skill tier
    const beginnerBtn = page.getByRole("button", { name: /beginner 600 elo/i });
    if (await beginnerBtn.isVisible()) {
      await beginnerBtn.click();
    }

    // Confirm Google login
    const confirmBtn = page.getByRole("button", { name: /confirm & continue/i });
    await confirmBtn.click();

    // Verify logged in with Beginner baseline 600 Elo
    const placementBanner = page.getByText(/placement test • puzzle 1 of 6/i);
    await expect(placementBanner).toBeVisible({ timeout: 8000 });

    const eloBadge = page.getByText(/est: 600 elo/i);
    await expect(eloBadge).toBeVisible();
  });

  test("4. Friends ranking and leaderboard functions seamlessly", async ({ page }) => {
    // Start in feed as guest
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
    });
    await page.goto("/");

    // Open Leaderboard rank modal
    const rankDockBtn = page.getByRole("button", { name: /leaderboard rank/i });
    await rankDockBtn.click();

    // Verify Global Standings
    await expect(page.getByRole("heading", { name: /global standings/i })).toBeVisible();

    // Switch to Friends Rank tab
    const friendsTabBtn = page.getByRole("button", { name: /friends rank/i });
    await friendsTabBtn.click();

    await expect(page.getByRole("heading", { name: /friends ranking/i })).toBeVisible();

    // Quick add Hikaru
    const quickAddHikaru = page.getByRole("button", { name: /\+hikaru_fan/i });
    if (await quickAddHikaru.isVisible()) {
      await quickAddHikaru.click();
    }

    // Verify friend appears in list
    const friendEntry = page.getByText(/hikarufan|hikaru_fan/i);
    await expect(friendEntry.first()).toBeVisible({ timeout: 5000 });

    // Close modal
    const closeBtn = page.getByRole("button", { name: /back to reels/i });
    await closeBtn.click();
    await expect(closeBtn).not.toBeVisible();
  });
});
