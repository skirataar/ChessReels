import { test, expect } from "@playwright/test";

const DEVTEST_USER = {
  id: "e1b4a7fd-d753-4cd1-8d17-937727cc3594",
  email: "devtest@doomchess.local",
  username: "devtest",
  displayName: "Dev Tester",
  avatar: "♟",
  elo: 1244,
  isCalibrated: true,
  calibrationStep: 6,
  plan: "free",
};

test.describe("7 UI and State Refinements Verification", () => {
  test("1. Login displays user real Elo immediately without reload and warms user stats cache", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Click Sign In on landing page (first button to avoid nav links)
    const signInNav = page.getByRole("button", { name: "Sign In" }).first();
    await expect(signInNav).toBeVisible({ timeout: 5000 });
    await signInNav.click();

    // Wait for auth modal to fully appear — look for the email/username textbox
    const loginUsernameInput = page.getByRole("textbox", { name: /username or email/i });
    // If modal opened on Register tab, switch to Sign In tab first
    const registerIndicator = page.getByRole("textbox", { name: /display name|name/i }).first();
    if (await registerIndicator.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole("button", { name: /sign in/i }).last().click();
    }
    await expect(loginUsernameInput).toBeVisible({ timeout: 5000 });
    await loginUsernameInput.fill(DEVTEST_USER.email);
    await page.getByRole("textbox", { name: /password/i }).fill("TestPassword123!");

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for redirect to /play
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // Header Elo rating-pill should display immediately (e.g. 1244), not 0 or NaN
    const headerElo = page.locator('[data-testid="rating-pill"]');
    await expect(headerElo).toBeVisible({ timeout: 5000 });
    const eloText = await headerElo.innerText();
    const eloValue = parseInt(eloText.replace(/\D/g, ""), 10);
    expect(eloValue).toBeGreaterThan(0);
    expect(isNaN(eloValue)).toBeFalsy();

    // Verify localStorage has chessreels_user_stats_v1 set
    const statsCache = await page.evaluate(() => {
      return localStorage.getItem("chessreels_user_stats_v1");
    });
    expect(statsCache).toBeTruthy();
    const parsed = JSON.parse(statsCache!);
    expect(parsed.elo).toBe(eloValue);
  });

  test("2. Sharp Board Corners (border-radius: 0px / rounded-none)", async ({ page }) => {
    await page.goto("/play");
    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      localStorage.setItem("chessreels_user_stats_v1", JSON.stringify({
        elo: user.elo,
        currentStreak: 2,
        lastSolvedDate: "2026-11-04",
        streakFreezes: 0,
        isFrozenState: false,
        perfectWeekCounter: 0,
        comboCount: 0,
      }));
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);

    const accountPromise = page.waitForResponse((resp) => resp.url().includes("/api/user/account") && resp.status() === 200).catch(() => null);
    await page.reload();
    await accountPromise;

    const chessboardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(chessboardContainer).toBeVisible({ timeout: 10000 });

    const borderRadius = await chessboardContainer.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius;
    });

    // Border radius must be strictly 0px
    expect(borderRadius).toBe("0px");
  });

  test("3, 4 & 5. Deliberate Solved Modal timing, clean modal styling, and instant dismiss on step back (<)", async ({ page }) => {
    const testPuzzleId = "mate_in_one_" + Date.now();
    const MATE_IN_ONE_PUZZLE = {
      id: testPuzzleId,
      fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
      moves: "e1e8",
      rating: 1200,
      ratingDeviation: 60,
      popularity: 100,
      nbPlays: 100,
      themes: "mate mateIn1",
      gameUrl: "https://lichess.org/test",
      openingTags: "Test Mate",
    };

    // Route random puzzle endpoint to guaranteed 1-move mate puzzle
    await page.route("**/api/puzzle/random*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MATE_IN_ONE_PUZZLE),
      });
    });

    // Route quota endpoint to ensure active quota (canPlay: true)
    await page.route("**/api/tier/quota*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          quota: {
            isPro: false,
            canPlay: true,
            puzzlesRemaining: 4,
            usedInWindow: 0,
            windowLimit: 4,
            windowHours: 4,
            adFrequency: 2,
            resetsInMs: 0,
          },
          config: {
            freePuzzleLimit: 4,
            freeWindowHours: 4,
            adFrequencyPuzzles: 2,
            proMonthlyPrice: 200,
            annualDiscountPercent: 5,
          },
        }),
      });
    });

    await page.goto("/play");
    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      localStorage.setItem("chessreels_user_stats_v1", JSON.stringify({
        elo: user.elo,
        currentStreak: 2,
        lastSolvedDate: "2026-11-04",
        streakFreezes: 0,
        isFrozenState: false,
        perfectWeekCounter: 0,
        comboCount: 0,
      }));
      // Clear cached puzzle queues and tier session limits
      localStorage.removeItem("chess_reel_solved_ids");
      localStorage.removeItem("chess_reel_puzzle_queue");
      localStorage.removeItem(`chess_reel_puzzle_queue_${user.id}`);
      localStorage.removeItem("chess_reel_puzzle_states");
      localStorage.removeItem("chess_reel_last_solved_puzzle");
      localStorage.removeItem("chess_reel_tier_session");
      localStorage.removeItem(`chess_reel_tier_session_${user.id}`);
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);

    const accountPromise = page.waitForResponse((resp) => resp.url().includes("/api/user/account") && resp.status() === 200).catch(() => null);
    await page.reload();
    await accountPromise;

    await page.waitForSelector('[data-testid="chessboard-container"]', { timeout: 10000 });
    await page.waitForSelector('[data-square="e1"]', { timeout: 10000 });

    // Execute the winning checkmate move: e1 -> e8 via click-select then click-target
    // Click the rook's square to select it
    await page.locator('[data-square="e1"]').click();
    // Wait briefly for selection highlights to register
    await page.waitForTimeout(100);
    // Click e8 to execute the move
    await page.locator('[data-square="e8"]').click();

    const solvedTitle = page.locator('text="PUZZLE SOLVED!"').or(page.locator('text="Puzzle Solved!"'));

    // Requirement 3: Deliberate 900ms pause
    // At 200ms, modal should NOT be visible yet
    await page.waitForTimeout(200);
    const visibleEarly = await solvedTitle.isVisible();
    expect(visibleEarly).toBeFalsy();

    // After 1100ms, modal SHOULD be visible
    await expect(solvedTitle).toBeVisible({ timeout: 3000 });

    // Requirement 4: Clean Solved Modal Stats & Icon
    // 1) NO streak pill (e.g. "Streak!" or "1 Streak!")
    const streakPill = page.locator('text=/\\d+ Streak!/');
    expect(await streakPill.count()).toBe(0);

    // 2) NO Sparkle Star (✨) next to title
    const modalText = await page.locator('.absolute.inset-0.bg-\\[\\#12100e\\]\\/95').innerText();
    expect(modalText).not.toContain("✨");

    // 3) Clean outline Trophy icon
    const trophy = page.getByTestId("solved-trophy");
    await expect(trophy).toBeVisible();

    // 4) Next Reel button present
    const nextBtn = page.locator('button:has-text("Next Reel")');
    await expect(nextBtn).toBeVisible();

    // Requirement 5: Dismiss Solved Modal Immediately When Stepping Back (< Button)
    const prevMoveBtn = page.locator('[data-testid="prev-puzzle-btn"]');
    await expect(prevMoveBtn).toBeVisible();
    await prevMoveBtn.click();

    // Solved modal should disappear immediately!
    await expect(solvedTitle).not.toBeVisible({ timeout: 1500 });
  });
});
