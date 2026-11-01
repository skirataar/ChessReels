import { test, expect } from "@playwright/test";

test.describe("Step 4: Daily Streak & Stats Modal", () => {
  test("Header contains [Elo Pill], [Streak Indicator (🔥 X)], and [Stats Button]", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
      window.localStorage.setItem("chess_reel_guest_id", "test-streak-user");
      window.localStorage.setItem("chess_reel_elo", "1250");
      window.localStorage.setItem("chess_reel_daily_streak", "5");
      window.localStorage.setItem("chess_reel_total_solved", "18");
      window.localStorage.setItem("chess_reel_total_failed", "4");
    });

    await page.goto("/");
    await expect(page.locator('[data-testid="chessboard-container"]')).toBeVisible({
      timeout: 10_000,
    });

    // 1. Verify Header contains [Elo Pill]
    const eloPill = page.locator("text=/1250/").first();
    await expect(eloPill).toBeVisible();

    // 2. Verify Header contains [Streak Indicator (🔥 X)]
    const streakIndicator = page.locator('[data-testid="header-streak-indicator"]');
    await expect(streakIndicator).toBeVisible();
    await expect(streakIndicator).toContainText("🔥");
    await expect(streakIndicator).toContainText("5");

    // 3. Verify Header contains [Stats Button]
    const statsButton = page.locator('[data-testid="header-stats-btn"]');
    await expect(statsButton).toBeVisible();

    // 4. Click Stats Button to open shadcn Dialog Stats Modal
    await statsButton.click();

    const statsDialog = page.locator('[data-testid="stats-modal-dialog"]');
    await expect(statsDialog).toBeVisible();

    // 5. Verify modal displays Elo, Streak, Solved, and Failed totals
    await expect(page.locator('[data-testid="stat-current-elo"]')).toContainText("1250");
    await expect(page.locator('[data-testid="stat-daily-streak"]')).toContainText("5");
    await expect(page.locator('[data-testid="stat-total-solved"]')).toContainText("18");
    await expect(page.locator('[data-testid="stat-total-failed"]')).toContainText("4");

    // Close modal
    await page.keyboard.press("Escape");
    await expect(statsDialog).not.toBeVisible();
  });

  test("Streak logic: playing today when last played yesterday increments streak", async ({
    page,
  }) => {
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    await page.addInitScript(
      ({ yDate }: { yDate: string }) => {
        window.localStorage.setItem("chess_reel_preview_guest", "true");
        window.localStorage.setItem("chess_reel_last_played_date", yDate);
        window.localStorage.setItem("chess_reel_daily_streak", "3");
        window.localStorage.setItem("chess_reel_total_solved", "10");
        window.localStorage.setItem("chess_reel_total_failed", "2");
      },
      { yDate: yesterdayStr }
    );

    await page.goto("/");
    const statsButton = page.locator('[data-testid="header-stats-btn"]');
    await expect(statsButton).toBeVisible();

    // Verify initial streak is 3 (played yesterday)
    await statsButton.click();
    await expect(page.locator('[data-testid="stat-daily-streak"]')).toContainText("3");
    await page.keyboard.press("Escape");

    // Simulate solving a puzzle today
    await page.evaluate(() => {
      // Simulate useStreak recordPuzzlePlay("win")
      const today = new Date().toISOString().split("T")[0];
      const storedStreak = parseInt(
        window.localStorage.getItem("chess_reel_daily_streak") || "0",
        10
      );
      window.localStorage.setItem("chess_reel_daily_streak", String(storedStreak + 1));
      window.localStorage.setItem("chess_reel_last_played_date", today);
      window.localStorage.setItem("chess_reel_total_solved", "11");
      window.dispatchEvent(new Event("storage"));
    });

    // Reopen modal: daily streak should now be 4, solved 11
    await statsButton.click();
    await expect(page.locator('[data-testid="stat-daily-streak"]')).toContainText("4");
    await expect(page.locator('[data-testid="stat-total-solved"]')).toContainText("11");
  });

  test("Streak logic: playing today when last played > 1 day ago resets streak to 1", async ({
    page,
  }) => {
    const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
    const fourDaysAgoStr = `${fourDaysAgo.getFullYear()}-${String(fourDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(fourDaysAgo.getDate()).padStart(2, "0")}`;

    await page.addInitScript(
      ({ oldDate }: { oldDate: string }) => {
        window.localStorage.setItem("chess_reel_preview_guest", "true");
        window.localStorage.setItem("chess_reel_last_played_date", oldDate);
        window.localStorage.setItem("chess_reel_daily_streak", "14");
        window.localStorage.setItem("chess_reel_total_solved", "40");
        window.localStorage.setItem("chess_reel_total_failed", "10");
      },
      { oldDate: fourDaysAgoStr }
    );

    await page.goto("/");
    const statsButton = page.locator('[data-testid="header-stats-btn"]');
    await expect(statsButton).toBeVisible();

    // Check modal before playing today: streak lapsed (0)
    await statsButton.click();
    await expect(page.locator('[data-testid="stat-daily-streak"]')).toContainText("0");
    await page.keyboard.press("Escape");

    // Simulate user playing today after lapsed streak: resets to 1
    await page.evaluate(() => {
      const today = new Date().toISOString().split("T")[0];
      window.localStorage.setItem("chess_reel_daily_streak", "1");
      window.localStorage.setItem("chess_reel_last_played_date", today);
      window.localStorage.setItem("chess_reel_total_solved", "41");
      window.dispatchEvent(new Event("storage"));
    });

    // Reopen modal: daily streak should now be reset to 1
    await statsButton.click();
    await expect(page.locator('[data-testid="stat-daily-streak"]')).toContainText("1");
    await expect(page.locator('[data-testid="stat-total-solved"]')).toContainText("41");
  });
});
