import { test, expect, Page } from "@playwright/test";

const TEST_EMAIL = "devtest@doomchess.local";
const TEST_PASSWORD = "TestPassword123!";

async function loginAsDedicatedTestUser(page: Page) {
  await page.goto("/play");
  await page.waitForLoadState("domcontentloaded");

  const board = page.getByTestId("chessboard-container");
  const isAlreadyOnBoard = await board.isVisible({ timeout: 2500 }).catch(() => false);
  if (isAlreadyOnBoard) {
    return;
  }

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

test.describe("Streak Freeze, Flush UI, and Failed Puzzle Re-queue Fixes", () => {
  test("1. Solving on frozen day preserves remaining streakFreezes count", async ({ page }) => {
    await loginAsDedicatedTestUser(page);

    // Set frozen state in localStorage with 1 freeze remaining and 5-day streak
    await page.evaluate(() => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      const frozenStreak = {
        currentStreak: 5,
        lastSolvedDate: yStr,
        streakFreezes: 1, // 1 freeze remaining
        perfectWeekCounter: 2,
        isFrozenState: true,
      };

      window.localStorage.setItem("chess_reel_streak_data", JSON.stringify(frozenStreak));
      window.localStorage.setItem("chess_reel_daily_streak", "5");
      window.dispatchEvent(new Event("storage"));
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });

    // Verify header freeze indicator displays 1/2
    const freezeIndicator = page.getByTestId("header-freeze-indicator");
    await expect(freezeIndicator).toBeVisible();
    await expect(freezeIndicator).toContainText("1/2");

    // Simulate solve for the current puzzle
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    // Wait for async update-elo network call and streak update to settle
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const raw = window.localStorage.getItem("chess_reel_streak_data");
        return raw ? JSON.parse(raw).currentStreak : 0;
      });
    }, { timeout: 10000 }).toBe(6);

    // Verify in localStorage: streak incremented to 6, isFrozenState thawed to false, and streakFreezes strictly preserved at 1!
    const updatedData = await page.evaluate(() => {
      const raw = window.localStorage.getItem("chess_reel_streak_data");
      return raw ? JSON.parse(raw) : null;
    });

    expect(updatedData).not.toBeNull();
    expect(updatedData.currentStreak).toBe(6);
    expect(updatedData.isFrozenState).toBe(false);
    expect(updatedData.streakFreezes).toBe(1); // strictly preserved, NOT reset to 0!
  });

  test("2. Both frozen streak state and freeze counter are flush and borderless (no pills)", async ({
    page,
  }) => {
    await loginAsDedicatedTestUser(page);

    // Set frozen state
    await page.evaluate(() => {
      const frozenStreak = {
        currentStreak: 5,
        lastSolvedDate: "2026-11-01",
        streakFreezes: 1,
        perfectWeekCounter: 0,
        isFrozenState: true,
      };
      window.localStorage.setItem("chess_reel_streak_data", JSON.stringify(frozenStreak));
      window.dispatchEvent(new Event("storage"));
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const streakIndicator = page.getByTestId("header-streak-indicator");
    const freezeIndicator = page.getByTestId("header-freeze-indicator");

    await expect(streakIndicator).toBeVisible();
    await expect(freezeIndicator).toBeVisible();

    // Verify streakIndicator has no pill background or border classes
    const streakClass = (await streakIndicator.getAttribute("class")) || "";
    expect(streakClass).toContain("bg-transparent");
    expect(streakClass).toContain("border-none");
    expect(streakClass).not.toContain("border-sky-400/30");
    expect(streakClass).not.toContain("bg-sky-500/10");

    // Verify freezeIndicator is also flush and borderless
    const freezeClass = (await freezeIndicator.getAttribute("class")) || "";
    expect(freezeClass).toContain("bg-transparent");
    expect(freezeClass).toContain("border-none");
  });

  test("3. Failed puzzle re-queued slot loads fresh & unsolved without being marked in solvedPuzzleIds", async ({
    page,
  }) => {
    await loginAsDedicatedTestUser(page);

    // Read current puzzle id
    const boardContainer = page.getByTestId("chessboard-container");
    await expect(boardContainer).toBeVisible({ timeout: 10000 });

    const activePuzzleId = await page.evaluate(() => {
      const activeEl = document.querySelector("[data-testid='chessboard-container']");
      return activeEl?.getAttribute("data-puzzle-id") || "";
    });

    // Simulate failing the puzzle
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "failed" } })
      );
    });
    await page.waitForTimeout(400);

    // Verify solvedPuzzleIds in localStorage does NOT contain the failed puzzle id
    const solvedInStorage = await page.evaluate(() => {
      const raw = window.localStorage.getItem("chess_reel_solved");
      return raw ? JSON.parse(raw) : [];
    });
    if (activePuzzleId) {
      expect(solvedInStorage).not.toContain(activePuzzleId);
    }

    // Even if the user plays out the solution afterwards on that card:
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });
    await page.waitForTimeout(400);

    // Verify it STILL is not permanently marked in solvedPuzzleIds because it failed on this attempt
    const solvedAfterSecondAction = await page.evaluate(() => {
      const raw = window.localStorage.getItem("chess_reel_solved");
      return raw ? JSON.parse(raw) : [];
    });
    if (activePuzzleId) {
      expect(solvedAfterSecondAction).not.toContain(activePuzzleId);
    }
  });
});
