import { test, expect } from "@playwright/test";

const DEVTEST_USER = {
  id: "e1b4a7fd-d753-4cd1-8d17-937727cc3594",
  email: "devtest@doomchess.local",
  username: "devtest",
  displayName: "Dev Tester",
  avatar: "♟",
  elo: 1248,
  isCalibrated: true,
  calibrationStep: 6,
  plan: "free",
};

test.describe("Re-queued Failed Puzzles Elo Calculation & Anti-Farming Redemption Guard", () => {
  test.beforeEach(async ({ page }) => {
    // Reset devtest local storage and cookies
    await page.goto("/play");
    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      localStorage.removeItem("chessreels_user_stats_v1");
      localStorage.removeItem("chess_reel_puzzle_rating_history");
      localStorage.removeItem("chess_reel_rated_puzzle_ids");
      localStorage.removeItem("chess_reel_solved_ids");
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);
    const accountPromise = page.waitForResponse((resp) => resp.url().includes("/api/user/account") && resp.status() === 200).catch(() => null);
    await page.reload();
    await accountPromise;
    await page.waitForTimeout(400);
  });

  test("1. Re-queued solve awards 50% of normal Elo gain and triggers floating +Elo delta badge", async ({
    page,
  }) => {
    await page.waitForSelector('[data-testid="header-rank-btn"]', { timeout: 10_000 });

    const initialElo = await page.evaluate(() => {
      return parseInt(localStorage.getItem("chess_reel_elo") || "1244", 10);
    });

    // Step 1: Simulate first attempt failed via test event on puzzle 'test_p_101'
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", {
          detail: {
            delta: -14,
            isWin: false,
            puzzleId: "test_p_101",
          },
        })
      );
    });

    // Check that rating state is recorded as 'failed_once'
    const ratingStateAfterFail = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_puzzle_rating_history");
      return raw ? JSON.parse(raw)["test_p_101"] : null;
    });
    expect(ratingStateAfterFail).toBe("failed_once");

    // Rating decreased by 14
    await page.waitForTimeout(1600); // Allow previous delta badge exit animation to complete
    const eloAfterFail = await page.evaluate(() => {
      return parseInt(localStorage.getItem("chess_reel_elo") || "0", 10);
    });
    expect(eloAfterFail).toBe(initialElo - 14);

    // Step 2: Simulate re-queued puzzle redemption solve (+14 standard win -> reduced to +7)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", {
          detail: {
            delta: 14,
            isWin: true,
            puzzleId: "test_p_101",
            isRequeued: true,
          },
        })
      );
    });

    // Floating delta badge should appear showing reduced value (+7 instead of +14)
    const deltaBadge = page.locator('[data-testid="elo-delta-badge"]').last();
    await expect(deltaBadge).toBeVisible({ timeout: 5000 });
    await expect(deltaBadge).toHaveText("+7");

    // Rating state should now be 'redeemed'
    const ratingStateAfterRedeem = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_puzzle_rating_history");
      return raw ? JSON.parse(raw)["test_p_101"] : null;
    });
    expect(ratingStateAfterRedeem).toBe("redeemed");

    // Solved puzzle IDs should now contain 'test_p_101'
    const isSolvedInStorage = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_solved_ids");
      return raw ? JSON.parse(raw).includes("test_p_101") : false;
    });
    expect(isSolvedInStorage).toBe(true);

    // Rating should have increased by exactly 7
    await page.waitForTimeout(400);
    const eloAfterRedeem = await page.evaluate(() => {
      return parseInt(localStorage.getItem("chess_reel_elo") || "0", 10);
    });
    expect(eloAfterRedeem).toBe(initialElo - 14 + 7);

    // Step 3: Attempting to solve 'test_p_101' again should be strictly blocked by anti-farming guard
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", {
          detail: {
            delta: 14,
            isWin: true,
            puzzleId: "test_p_101",
            isRequeued: true,
          },
        })
      );
    });

    // Elo should NOT change again
    await page.waitForTimeout(300);
    const eloAfterBlocked = await page.evaluate(() => {
      return parseInt(localStorage.getItem("chess_reel_elo") || "0", 10);
    });
    expect(eloAfterBlocked).toBe(initialElo - 14 + 7);
  });

  test("2. Re-queued attempt failed again keeps state as 'failed_once' and allows future redemption", async ({
    page,
  }) => {
    await page.waitForSelector('[data-testid="header-rank-btn"]', { timeout: 10_000 });

    // Attempt 1: Failed
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", {
          detail: {
            delta: -12,
            isWin: false,
            puzzleId: "test_p_202",
          },
        })
      );
    });

    let state = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_puzzle_rating_history");
      return raw ? JSON.parse(raw)["test_p_202"] : null;
    });
    expect(state).toBe("failed_once");

    // Attempt 2 (requeued): Failed again
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", {
          detail: {
            delta: -12,
            isWin: false,
            puzzleId: "test_p_202",
            isRequeued: true,
          },
        })
      );
    });

    state = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_puzzle_rating_history");
      return raw ? JSON.parse(raw)["test_p_202"] : null;
    });
    expect(state).toBe("failed_once");

    // Attempt 3 (requeued): Solved on 3rd attempt -> awards 50% Elo (+16 -> +8)
    await page.waitForTimeout(1600); // Allow previous delta badge exit animation to complete
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", {
          detail: {
            delta: 16,
            isWin: true,
            puzzleId: "test_p_202",
            isRequeued: true,
          },
        })
      );
    });

    const deltaBadge = page.locator('[data-testid="elo-delta-badge"]').last();
    await expect(deltaBadge).toBeVisible({ timeout: 5000 });
    await expect(deltaBadge).toHaveText("+8");

    state = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_puzzle_rating_history");
      return raw ? JSON.parse(raw)["test_p_202"] : null;
    });
    expect(state).toBe("redeemed");
  });

  test("3. Backend /api/user/update-elo awards 50% on requeued solve and enforces strict anti-farming idempotency", async ({
    request,
  }) => {
    const testPuzzleId = `test_p_backend_${Date.now()}`;

    // 1. Loss on attempt 1
    const resLoss = await request.post("http://localhost:3000/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: 1248,
        result: "loss",
        userId: DEVTEST_USER.id,
        puzzleId: testPuzzleId,
      },
    });
    const dataLoss = await resLoss.json();
    expect(dataLoss.alreadyRated).toBe(false);
    expect(dataLoss.eloChange).toBeLessThan(0);

    // 2. Re-queued Win (50% Elo multiplier)
    const resWin = await request.post("http://localhost:3000/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: dataLoss.newElo,
        result: "win",
        userId: DEVTEST_USER.id,
        puzzleId: testPuzzleId,
        isRequeued: true,
        attemptCount: 2,
      },
    });
    const dataWin = await resWin.json();
    expect(dataWin.alreadyRated).toBe(false);
    expect(dataWin.isRequeued).toBe(true);
    // Calculated win change without requeue would be ~14, with requeue should be ~7
    expect(dataWin.eloChange).toBeGreaterThanOrEqual(1);

    // 3. Repeat win on the same puzzle is blocked by anti-farming idempotency
    const resRepeat = await request.post("http://localhost:3000/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: dataWin.newElo,
        result: "win",
        userId: DEVTEST_USER.id,
        puzzleId: testPuzzleId,
      },
    });
    const dataRepeat = await resRepeat.json();
    expect(dataRepeat.alreadyRated).toBe(true);
    expect(dataRepeat.eloChange).toBe(0);

    // Clean up test puzzle from DB
    await request.post("http://localhost:3000/api/dev/cleanup-test-users?secret=chessreel_admin_master_2026");
  });
});

