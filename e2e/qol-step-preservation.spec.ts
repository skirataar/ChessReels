import { test, expect } from "@playwright/test";

test.describe("QOL Step Preservation on Retry", () => {
  test("When blunder occurs on Step x+1, Retry preserves the previous x steps", async ({
    page,
  }) => {
    // Intercept /api/puzzle/random to serve predictable 2-step puzzle: f1c4 -> g8f6 -> e1g1
    await page.route("**/api/puzzle/random**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "qol-test-step-preservation-101",
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
          moves: "f1c4 g8f6 e1g1",
          rating: 1300,
          ratingDeviation: 60,
          popularity: 95,
          nbPlays: 500,
          themes: "opening",
          gameUrl: "https://lichess.org/test",
          openingTags: "Italian Game",
        }),
      });
    });

    await page.route("**/api/user/account**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-qol-calibrated-user-1",
            username: "qol_user_1",
            elo: 1250,
            isCalibrated: true,
            plan: "free",
          },
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "test-qol-calibrated-user-1",
        username: "qol_user_1",
        elo: 1250,
        isCalibrated: true,
        plan: "free",
      }));
      window.localStorage.setItem("chess_reel_guest_id", "test-qol-guest");
      window.localStorage.setItem("chess_reel_elo", "1250");
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/play", { waitUntil: "networkidle" });

    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(boardContainer).toBeVisible({ timeout: 10000 });

    // Verify initial Step 1 of 2
    await expect(page.getByText(/Step 1 of 2/i)).toBeVisible();

    // 1. Play first correct move: f1 to c4
    const f1Square = page.locator('[data-square="f1"]');
    const c4Square = page.locator('[data-square="c4"]');
    await f1Square.click();
    await c4Square.click();

    // Opponent replies g8f6 automatically after ~300ms
    // Check progress advances to Step 2 of 2
    await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 5000 });

    // Verify bishop is on c4 and black knight is on f6
    const c4Piece = page.locator('[data-square="c4"]');
    await expect(c4Piece).toBeVisible();

    // 2. Play INCORRECT move on Step 2 (e.g. h2 to h3 instead of castling e1g1)
    const h2Square = page.locator('[data-square="h2"]');
    const h3Square = page.locator('[data-square="h3"]');
    await h2Square.click();
    await h3Square.click();

    // 3. Failure banner appears cleanly
    const failedBanner = page.locator('[data-testid="puzzle-failed-banner"]');
    await expect(failedBanner).toBeVisible({ timeout: 5000 });
    await expect(failedBanner).toContainText("Inaccurate Move");

    // Retry button displays clean "Retry" without mentioning step numbers
    const retryBtn = page.locator('[data-testid="retry-puzzle-btn"]');
    await expect(retryBtn).toHaveText(/Retry$/);

    // Also restart button is visible
    const restartBtn = page.locator('[data-testid="restart-puzzle-btn"]');
    await expect(restartBtn).toBeVisible();

    // 4. Click "Retry"
    await retryBtn.click({ force: true });

    // Error banner should disappear and NO "Saved progress" toast pill dropdown should appear
    await expect(failedBanner).not.toBeVisible();
    await expect(page.locator("text=Saved progress")).toHaveCount(0);

    // 5. CRITICAL VERIFICATION:
    // Board is STILL at Step 2 of 2! The previous step was NOT wiped out!
    await expect(page.getByText(/Step 2 of 2/i)).toBeVisible();

    // 6. Complete the puzzle by playing the correct 2nd move: Castling e1 to g1
    const e1Square = page.locator('[data-square="e1"]');
    const g1Square = page.locator('[data-square="g1"]');
    await e1Square.click();
    await g1Square.click();

    // Puzzle Solved celebration should appear!
    await expect(page.getByText("Puzzle Solved!", { exact: false })).toBeVisible({
      timeout: 6000,
    });
  });

  test("Restart button resets puzzle all the way back to Step 1", async ({
    page,
  }) => {
    // Intercept /api/puzzle/random with the same 2-step puzzle
    await page.route("**/api/puzzle/random**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "qol-test-restart-102",
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
          moves: "f1c4 g8f6 e1g1",
          rating: 1300,
          ratingDeviation: 60,
          popularity: 95,
          nbPlays: 500,
          themes: "opening",
          gameUrl: "https://lichess.org/test",
          openingTags: "Italian Game",
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "test-qol-user-2",
        username: "qol_user_2",
        elo: 1250,
        isCalibrated: true,
        plan: "free",
      }));
      window.localStorage.setItem("chess_reel_guest_id", "test-qol-guest-2");
      window.localStorage.setItem("chess_reel_elo", "1250");
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/play", { waitUntil: "networkidle" });

    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(boardContainer).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Step 1 of 2/i)).toBeVisible();

    // Step 1: Play f1 to c4
    await page.locator('[data-square="f1"]').click();
    await page.locator('[data-square="c4"]').click();

    // Wait for Step 2
    await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 5000 });

    // Blunder on Step 2: h2 to h3
    await page.locator('[data-square="h2"]').click();
    await page.locator('[data-square="h3"]').click();

    const failedBanner = page.locator('[data-testid="puzzle-failed-banner"]');
    await expect(failedBanner).toBeVisible({ timeout: 5000 });

    // Click "Restart"
    const restartBtn = page.locator('[data-testid="restart-puzzle-btn"]');
    await restartBtn.click({ force: true });

    // Should reset all the way back to Step 1 of 2
    await expect(page.getByText(/Step 1 of 2/i)).toBeVisible();
    await expect(failedBanner).not.toBeVisible();
  });
});
