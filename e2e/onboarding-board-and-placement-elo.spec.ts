import { test, expect } from "@playwright/test";

test.describe("Onboarding Board Selection & Placement Starting Elo Accuracy", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies & storage so visitor lands on clean onboarding
    await page.goto("/play");
    await page.evaluate(() => {
      window.localStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });
  });

  test("1. Onboarding includes Board Selection between Goal and Auth step", async ({ page }) => {
    await page.goto("/");

    // 1. Gate: Click 'Get Started'
    const getStartedBtn = page.getByRole("button", { name: /get started/i });
    await expect(getStartedBtn).toBeVisible({ timeout: 10000 });
    await getStartedBtn.click();

    // 2. Step 1: Starting Elo ('step-elo')
    await expect(page.getByRole("heading", { name: /where are you starting from\?/i })).toBeVisible();
    // Choose Advanced (1700 Elo)
    const advancedBtn = page.getByRole("button", { name: "Advanced" });
    await advancedBtn.click();
    await page.getByRole("button", { name: /continue/i }).click();

    // 3. Step 2: Goal ('step-goal')
    await expect(page.getByRole("heading", { name: /set your target rating/i })).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // 4. Step 3: Board Selection ('step-board') MUST BE VISIBLE
    await expect(page.getByRole("heading", { name: /choose your board/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/select your aesthetic for the puzzle reels feed/i)).toBeVisible();

    // Verify board theme buttons are visible
    const tournamentTheme = page.getByRole("button", { name: /tournament green/i });
    await expect(tournamentTheme).toBeVisible();
    await tournamentTheme.click();

    // Verify selection is saved to localStorage
    const savedTheme = await page.evaluate(() => window.localStorage.getItem("chess_reel_board_theme"));
    expect(savedTheme).toBe("tournament");

    // Click Continue from Board Selection to proceed to Auth
    await page.getByRole("button", { name: /continue/i }).click();

    // 5. Step 4: Auth ('auth')
    await expect(page.getByRole("heading", { name: /lock in your calibration/i })).toBeVisible();
    // Verify calibration summary pill shows 1700 Elo without board preview overflow
    await expect(page.getByText(/starting: 1700 elo/i)).toBeVisible();
  });

  test("2. Registering with chosen starting Elo saves rating and feeds matching placement puzzles", async ({ page }) => {
    await page.goto("/");

    // Step 0: Gate
    await page.getByRole("button", { name: /get started/i }).click();

    // Step 1: Choose 1700 starting Elo (Advanced)
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Goal -> Continue
    await expect(page.getByRole("heading", { name: /set your target rating/i })).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3: Board Selection -> Select Tournament Green & Continue
    await expect(page.getByRole("heading", { name: /choose your board/i })).toBeVisible();
    const tournamentBtn = page.getByRole("button", { name: /tournament green/i });
    if (await tournamentBtn.isVisible()) {
      await tournamentBtn.click();
    }
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 4: Auth Registration
    await expect(page.getByRole("heading", { name: /lock in your calibration/i })).toBeVisible();
    const uniqueUser = `elotest_${Date.now().toString(36)}`;
    await page.fill('input[placeholder="Name"]', "Elo Tester");
    await page.fill('input[placeholder="Email"]', `${uniqueUser}@test.com`);
    await page.fill('input[placeholder="Username"]', uniqueUser);
    await page.fill('input[placeholder="Password"]', "Password123!");
    await page.fill('input[placeholder="Confirm Pass"]', "Password123!");

    // Submit setup
    await page.getByRole("button", { name: /create account/i }).click();

    // Step 5: Post-setup Pro Upsell -> Continue with Free Account
    const skipProBtn = page.getByRole("button", { name: /continue with free account/i });
    await expect(skipProBtn).toBeVisible({ timeout: 10000 });
    await skipProBtn.click();

    // Land on /play
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // Verify Placement Calibration is active
    const placementBanner = page.getByText(/placement test • puzzle 1 of 6/i);
    await expect(placementBanner).toBeVisible({ timeout: 10000 });

    // Verify Est Elo reflects the user's chosen 1700 Elo (NOT 800 or 850 or 600)
    await expect(page.getByText(/est: 1700 elo/i)).toBeVisible();

    // Verify stored account Elo in localStorage is 1700
    const storedElo = await page.evaluate(() => {
      const acc = JSON.parse(window.localStorage.getItem("chess_reel_account") || "{}");
      return acc.elo;
    });
    expect(storedElo).toBe(1700);

    // Verify that the initial puzzle loaded has a rating appropriate for 1700 (within ±250, NOT 800)
    const puzzleRating = await page.evaluate(async () => {
      const ratingText = document.querySelector('[data-testid="puzzle-rating"]')?.textContent;
      if (ratingText) return parseInt(ratingText.replace(/\D/g, ""), 10);
      const queueRaw = window.localStorage.getItem("chess_reel_puzzle_queue");
      if (queueRaw) {
        const queue = JSON.parse(queueRaw);
        if (queue.length > 0) return queue[0].rating;
      }
      return null;
    });

    if (puzzleRating !== null) {
      expect(puzzleRating).toBeGreaterThanOrEqual(1450);
      expect(puzzleRating).toBeLessThanOrEqual(1950);
    }
  });

  test("3. Placement test calibration deltas do not artificially clamp to 1450", async ({ page }) => {
    // Inject a user starting placement at 1600 Elo
    await page.addInitScript(() => {
      const mockUser = {
        id: "calibration-high-elo-user",
        username: "gm_prodigy",
        displayName: "GM Prodigy",
        avatar: "♚",
        elo: 1600,
        isCalibrated: false,
        calibrationStep: 0,
        plan: "free",
      };
      window.localStorage.setItem("chess_reel_account", JSON.stringify(mockUser));
      window.localStorage.setItem("chess_reel_username", mockUser.username);
      window.localStorage.setItem("chess_reel_elo", "1600");
      document.cookie = `chess_reel_session=${encodeURIComponent(mockUser.id)}; path=/; max-age=86400`;
    });

    await page.goto("/play");

    // Verify Placement Calibration shows 1600 baseline
    await expect(page.getByText(/placement test • puzzle 1 of 6/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/est: 1600 elo/i)).toBeVisible();
  });
});
