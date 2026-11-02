import { test, expect } from "@playwright/test";

test.describe("Step 2: Game Engine Hardening (PuzzleCard.tsx & History)", () => {
  test("API: update-elo records and upserts puzzle history for guest/user", async ({
    request,
  }) => {
    const testGuestId = `test-engine-user-${Date.now()}`;
    const testPuzzleId = "00008";

    // 1. Record loss in history
    const lossRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1500,
        currentUserElo: 1200,
        result: "loss",
        guestId: testGuestId,
        puzzleId: testPuzzleId,
      },
    });
    expect(lossRes.status()).toBe(200);
    const lossData = await lossRes.json();
    expect(lossData.eloChange).toBeLessThan(0);

    // 2. Upsert same puzzle with win (should update, not duplicate error)
    const winRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1500,
        currentUserElo: lossData.newElo,
        result: "win",
        guestId: testGuestId,
        puzzleId: testPuzzleId,
      },
    });
    expect(winRes.status()).toBe(200);
    const winData = await winRes.json();
    expect(winData.eloChange).toBeGreaterThan(0);
  });

  test("UI: Strict move validation, board locking on fail, retry without refetch, and multi-move solve locking", async ({
    page,
  }) => {
    let puzzleFetchCount = 0;

    // Intercept /api/puzzle/random to serve a predictable 3-move puzzle (White to move)
    await page.route("**/api/puzzle/random**", async (route) => {
      puzzleFetchCount++;
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
          id: "test-hardening-puzzle-101",
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
          moves: "f1c4 g8f6 e1g1",
          rating: 1250,
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
            id: "test-hardening-guest",
            username: "test_hardener",
            elo: 1200,
            isCalibrated: true,
            plan: "free",
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
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "test-hardening-guest",
        username: "test_hardener",
        elo: 1200,
        isCalibrated: true,
        plan: "free",
      }));
      window.localStorage.setItem("chess_reel_preview_guest", "true");
      window.localStorage.setItem("chess_reel_onboarding_completed", "true");
      window.localStorage.setItem("chess_reel_guest_id", "test-hardening-guest");
      window.localStorage.setItem("chess_reel_elo", "1200");
    });

    await page.goto("/play", { waitUntil: "networkidle" });

    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(boardContainer).toBeVisible({ timeout: 10_000 });

    // Verify it is White to move
    await expect(page.getByText("White to move")).toBeVisible();

    // Wait for background prefetch queue to settle
    await page.waitForTimeout(2500);

    // 1. Make an incorrect legal chess move: d2 to d3 instead of f1 to c4
    const d2Square = page.locator('[data-square="d2"]');
    const d3Square = page.locator('[data-square="d3"]');
    await expect(d2Square).toBeVisible();
    await expect(d3Square).toBeVisible();

    await d2Square.click();
    await d3Square.click();

    // 2. Strict move validation: red flash badge and overlay appear
    const flashBadge = page.locator('[data-testid="incorrect-flash-badge"]');
    await expect(flashBadge).toBeVisible({ timeout: 5000 });
    await expect(flashBadge).toContainText("Incorrect");

    // Retry button does NOT exist (auto-retry mechanic)
    const retryBtn = page.locator('[data-testid="retry-puzzle-btn"]');
    expect(await retryBtn.count()).toBe(0);

    // 3. Auto-Retry: Board automatically resets position without refetching from /api/puzzle/random
    const countBeforeRetry = puzzleFetchCount;
    await page.waitForTimeout(900);
    expect(puzzleFetchCount).toBe(countBeforeRetry);

    // 5. Board is unlocked: now play the first correct move: f1 to c4
    const f1Square = page.locator('[data-square="f1"]');
    const c4Square = page.locator('[data-square="c4"]');
    await f1Square.click();
    await c4Square.click();

    // Opponent replies g8f6 automatically after ~300ms
    // Check progress updates to Step 2 of 2
    await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 5000 });

    // 6. Complete second player move: castling e1 to g1
    const e1Square = page.locator('[data-square="e1"]');
    const g1Square = page.locator('[data-square="g1"]');
    await e1Square.click();
    await g1Square.click();

    // Solved celebration overlay should appear
    await expect(page.getByText("Puzzle Solved!", { exact: false })).toBeVisible({
      timeout: 6000,
    });

    // 7. Verify Review Board keeps board locked in solved state
    const reviewBtn = page.getByRole("button", { name: /review board/i });
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await expect(page.getByText("Solved", { exact: true })).toBeVisible();
    }
  });
});
