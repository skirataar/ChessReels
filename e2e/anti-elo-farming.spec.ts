import { test, expect, Page } from "@playwright/test";

const TEST_EMAIL = "devtest@doomchess.local";
const TEST_PASSWORD = "TestPassword123!";

async function loginAsDedicatedTestUser(page: Page) {
  await page.goto("/play");
  await page.waitForLoadState("domcontentloaded");

  // Check if already authenticated on /play
  const board = page.getByTestId("chessboard-container");
  const isAlreadyOnBoard = await board.isVisible({ timeout: 2500 }).catch(() => false);
  if (isAlreadyOnBoard) {
    return;
  }

  // Otherwise, go to landing and sign in
  await page.goto("/");
  const signInBtn = page.getByRole("button", { name: "Sign In" });
  if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signInBtn.click();
    await page.fill('input[placeholder="Username or email"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });
  } else {
    const playNow = page.getByRole("button", { name: /Play Now|Play/i });
    if (await playNow.isVisible()) {
      await playNow.click();
      await page.waitForURL(/\/play/, { timeout: 10000 });
    }
  }

  await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });
}

test.describe("Anti-Elo Farming & Per-Puzzle Completion State Persistence", () => {
  test("1. Backend API prevents Elo farming with strict idempotency check", async ({
    request,
  }) => {
    // 1. Authenticate using the single dedicated test account
    const loginRes = await request.post("/api/user/login", {
      data: {
        username: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });
    expect(loginRes.ok()).toBe(true);
    const { user } = await loginRes.json();
    expect(user.username).toBe("devtest");
    expect(user.id).toBeTruthy();

    // Use a unique puzzle ID for this run to test idempotency
    const puzzleId = `anti_farm_guard_${Date.now()}`;

    // First solve call: should award Elo and record history
    const solve1 = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1200,
        currentUserElo: user.elo,
        result: "win",
        userId: user.id,
        puzzleId,
      },
    });
    expect(solve1.ok()).toBe(true);
    const res1 = await solve1.json();
    expect(res1.alreadyRated).toBe(false);
    expect(res1.eloChange).toBeGreaterThan(0);
    const awardedElo = res1.newElo;

    // Second solve call for SAME puzzleId: must be rejected by backend idempotency guard
    const solve2 = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1200,
        currentUserElo: awardedElo,
        result: "win",
        userId: user.id,
        puzzleId,
      },
    });
    expect(solve2.ok()).toBe(true);
    const res2 = await solve2.json();
    expect(res2.alreadyRated).toBe(true);
    expect(res2.eloChange).toBe(0);
    expect(res2.currentElo).toBe(awardedElo);

    // Verify user record in database still has the original single-solve Elo
    const accountCheck = await request.get(`/api/user/account?userId=${user.id}`);
    expect(accountCheck.ok()).toBe(true);
    const accData = await accountCheck.json();
    expect(accData.user.elo).toBe(awardedElo);
  });

  test("2. Swiping back to solved puzzle restores completed state & does not farm Elo", async ({
    page,
  }) => {
    // Authenticate using dedicated test account
    await loginAsDedicatedTestUser(page);

    // Wait for chessboard container
    const boardContainer = page.getByTestId("chessboard-container");
    await expect(boardContainer).toBeVisible({ timeout: 10000 });

    // Initial Elo check
    const ratingPill = page.getByTestId("rating-pill");
    await expect(ratingPill).toBeVisible({ timeout: 10000 });

    // Simulate solve for Puzzle 0
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });
    await page.waitForTimeout(500);

    // Advance to next puzzle (via Next Reel button if visible, or ArrowDown)
    const nextReelBtn = page.getByRole("button", { name: "Next Reel" });
    let advanced = false;
    if (await nextReelBtn.isVisible().catch(() => false)) {
      try {
        await nextReelBtn.click({ timeout: 2500 });
        advanced = true;
      } catch {}
    }
    if (!advanced) {
      await page.keyboard.press("ArrowDown");
    }
    await page.waitForTimeout(1000);

    // Read Elo after solving Puzzle 0
    const eloAfterPuzzle0 = await page.evaluate(() => {
      const eloEl = document.querySelector('[data-testid="rating-pill"]');
      return eloEl ? parseInt(eloEl.textContent?.replace(/\D/g, "") || "0", 10) : 0;
    });

    // Swipe back to Puzzle 0 using ArrowUp
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(1000);

    // Verify Puzzle 0 is restored in completed state:
    // 1. Status bar displays "Solved"
    const statusBar = page.getByTestId("puzzle-status-bar");
    await expect(statusBar).toContainText("Solved");

    // 2. Previous move button (<) is enabled, Next move button (>) is disabled
    const prevMoveBtn = page.getByTestId("prev-puzzle-btn");
    const nextMoveBtn = page.getByTestId("next-puzzle-btn");
    await expect(prevMoveBtn).toBeEnabled();
    await expect(nextMoveBtn).toBeDisabled();

    // 3. User Elo must NOT have incremented again on swiping back!
    const eloAfterSwipeBack = await page.evaluate(() => {
      const eloEl = document.querySelector('[data-testid="rating-pill"]');
      return eloEl ? parseInt(eloEl.textContent?.replace(/\D/g, "") || "0", 10) : 0;
    });
    expect(eloAfterSwipeBack).toBe(eloAfterPuzzle0);

    // 4. Stepping back (<) updates board position and enables (>)
    const initialRestoredFen = await boardContainer.getAttribute("data-fen");
    await prevMoveBtn.click();
    await page.waitForTimeout(300);
    const steppedBackFen = await boardContainer.getAttribute("data-fen");
    expect(steppedBackFen).not.toBe(initialRestoredFen);
    await expect(nextMoveBtn).toBeEnabled();

    // 5. Stepping forward (>) returns to final position
    await nextMoveBtn.click();
    await page.waitForTimeout(300);
    const steppedForwardFen = await boardContainer.getAttribute("data-fen");
    expect(steppedForwardFen).toBe(initialRestoredFen);
  });

  test("3. Retry on completed puzzle enters Review Mode with zero Elo awarded", async ({
    page,
  }) => {
    // Authenticate using dedicated test account
    await loginAsDedicatedTestUser(page);

    // Solve the puzzle first
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });
    await page.waitForTimeout(500);

    // Dismiss celebration by clicking "Review Board" if present
    const reviewBoardBtn = page.getByRole("button", { name: "Review Board" });
    if (await reviewBoardBtn.isVisible().catch(() => false)) {
      try {
        await reviewBoardBtn.click({ timeout: 2000 });
      } catch {}
    }
    await page.waitForTimeout(300);

    const eloBeforeRetry = await page.evaluate(() => {
      const eloEl = document.querySelector('[data-testid="rating-pill"]');
      return eloEl ? parseInt(eloEl.textContent?.replace(/\D/g, "") || "0", 10) : 0;
    });

    // Click Reset / Retry button
    const resetBtn = page.getByTestId("reset-puzzle-btn");
    await resetBtn.click();
    await page.waitForTimeout(500);

    // Board enters Review Mode
    const statusBar = page.getByTestId("puzzle-status-bar");
    await expect(statusBar).toContainText("Review");

    // Simulate solving the puzzle again in Review Mode
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });
    await page.waitForTimeout(500);

    // Verify Elo remained exactly identical
    const eloAfterReviewSolve = await page.evaluate(() => {
      const eloEl = document.querySelector('[data-testid="rating-pill"]');
      return eloEl ? parseInt(eloEl.textContent?.replace(/\D/g, "") || "0", 10) : 0;
    });
    expect(eloAfterReviewSolve).toBe(eloBeforeRetry);

    // Celebration hero overlay with "+Elo" should NOT be shown in review mode
    const celebrationNextReel = page.getByRole("button", { name: "Next Reel" });
    await expect(celebrationNextReel).not.toBeVisible();
  });
});
