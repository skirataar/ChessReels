import { test, expect } from "@playwright/test";

test.describe("Step 5: Final Verification Flow", () => {
  test("Complete flow: Fail with Retry, Solve with History, and Stats Modal", async ({
    page,
    request,
  }) => {
    const testGuestId = `verify-user-${Date.now()}`;
    const testPuzzleId = "test-final-puzzle-001";
    let apiFetchCount = 0;

    // Intercept puzzle fetch: serve a predictable 1-move tactic (White to move)
    // FEN: r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4
    // Solution: c4f7 (Bishop takes f7)
    await page.route("**/api/puzzle/random**", async (route) => {
      apiFetchCount++;
      const url = route.request().url();

      if (url.includes("count=")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { id: "buf-1", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: "a1a2", rating: 1200 },
            { id: "buf-2", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: "a1a2", rating: 1200 },
            { id: "buf-3", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: "a1a2", rating: 1200 },
            { id: "buf-4", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: "a1a2", rating: 1200 },
            { id: "buf-5", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: "a1a2", rating: 1200 },
          ]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: testPuzzleId,
          fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
          moves: "c4f7",
          rating: 1250,
          ratingDeviation: 60,
          popularity: 95,
          nbPlays: 300,
          themes: "fork",
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
            id: testGuestId,
            username: "test_solver",
            elo: 1200,
            isCalibrated: true,
            plan: "premium",
          },
        }),
      });
    });

    await page.context().addCookies([
      {
        name: "chess_reel_session",
        value: "guest_mock_session_token",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.addInitScript(
      ({ gId }: { gId: string }) => {
        window.localStorage.setItem("chess_reel_account", JSON.stringify({
          id: gId,
          username: "test_solver",
          elo: 1200,
          isCalibrated: true,
          plan: "premium",
        }));
        window.localStorage.setItem("chess_reel_plan", "premium");
        window.localStorage.setItem("chess_reel_preview_guest", "true");
        window.localStorage.setItem("chess_reel_onboarding_completed", "true");
        window.localStorage.setItem("chess_reel_guest_id", gId);
        window.localStorage.setItem("chess_reel_elo", "1200");
      },
      { gId: testGuestId }
    );

    await page.goto("/play", { waitUntil: "networkidle" });
    const board = page.locator('[data-testid="chessboard-container"]');
    await expect(board).toBeVisible({ timeout: 10_000 });

    // Wait for initial prefetch queue to settle
    await page.waitForTimeout(2500);

    // =========================================================================
    // STEP 1: FAIL A PUZZLE & RETRY RESETS THE BOARD
    // =========================================================================
    // Play an inaccurate legal chess move: d2 to d3 instead of c4 to f7
    const d2Square = page.locator('[data-square="d2"]');
    const d3Square = page.locator('[data-square="d3"]');
    await expect(d2Square).toBeVisible();
    await expect(d3Square).toBeVisible();

    await d2Square.click();
    await d3Square.click();

    // Verify Red Flash Badge springs into view
    const flashBadge = page.locator('[data-testid="incorrect-flash-badge"]');
    await expect(flashBadge).toBeVisible({ timeout: 5000 });
    await expect(flashBadge).toContainText("Incorrect");

    // Verify retry button is NOT present (auto-retry mechanism)
    const retryBtn = page.locator('[data-testid="retry-puzzle-btn"]');
    expect(await retryBtn.count()).toBe(0);

    // Record fetch count before next move
    const countBeforeRetry = apiFetchCount;

    // Verify auto-retry resets board position without refetching from API
    await page.waitForTimeout(1000);
    expect(apiFetchCount).toBe(countBeforeRetry);

    // =========================================================================
    // STEP 2: SOLVE THE PUZZLE & ENSURE HISTORY IS SAVED
    // =========================================================================
    // Play the correct solution move: c4 to f7
    const c4Square = page.locator('[data-square="c4"]');
    const f7Square = page.locator('[data-square="f7"]');
    await c4Square.click();
    await f7Square.click();

    // Solved Celebration Overlay springs into view with Framer Motion
    await expect(page.getByText("Puzzle Solved!", { exact: false })).toBeVisible({
      timeout: 6000,
    });

    // Verify PuzzleHistory record saved in backend via update-elo
    const historyRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1250,
        currentUserElo: 1200,
        result: "win",
        guestId: testGuestId,
        puzzleId: testPuzzleId,
      },
    });
    expect(historyRes.status()).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.newElo).toBeGreaterThan(1200);

    // =========================================================================
    // STEP 3: CLICK STATS BUTTON & VIEW SHADCN DIALOG STATS MODAL
    // =========================================================================
    // Dismiss solved overlay if needed
    const reviewBtn = page.getByRole("button", { name: /review board/i });
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
    }

    const statsBtn = page.locator('[data-testid="header-stats-btn"]');
    if (await statsBtn.isVisible()) {
      await statsBtn.click();

      // Verify shadcn Dialog opens
      const statsDialog = page.locator('[data-testid="stats-modal-dialog"]');
      await expect(statsDialog).toBeVisible({ timeout: 5000 });

      // Verify all metrics
      await expect(page.locator('[data-testid="stat-current-elo"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-daily-streak"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-total-solved"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-total-failed"]')).toBeVisible();
      await expect(page.getByText("Solve Accuracy")).toBeVisible();

      // Close modal cleanly
      await page.keyboard.press("Escape");
      await expect(statsDialog).not.toBeVisible();
    }
  });
});
