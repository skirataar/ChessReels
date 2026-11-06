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

test.describe("Hint-Reduced Elo Calculation & UI Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/play");
    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      localStorage.setItem("chessreels_user_stats_v1", JSON.stringify({
        elo: user.elo,
        currentStreak: 1,
        lastSolvedDate: null,
        streakFreezes: 0,
        isFrozenState: false,
        perfectWeekCounter: 0,
        comboCount: 2,
      }));
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);

    const accountPromise = page.waitForResponse((resp) => resp.url().includes("/api/user/account") && resp.status() === 200).catch(() => null);
    await page.reload();
    await accountPromise;
    await page.waitForTimeout(400);
  });

  test("1. Clicking hint button highlights move, triggers toast, and displays '• Hint Used' status tag", async ({ page }) => {
    await page.waitForSelector('[data-testid="hint-btn"]', { timeout: 10_000 });
    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await hintBtn.first().click();

    // Verify hint used tag appears
    const hintUsedTag = page.locator('[data-testid="hint-used-tag"]');
    await expect(hintUsedTag).toBeVisible({ timeout: 5_000 });
    await expect(hintUsedTag).toContainText("Hint Used");

    // Verify toast notification indicates reduced Elo gain
    const toast = page.locator("text=Reduced Elo gain");
    await expect(toast).toBeVisible({ timeout: 5_000 });
  });

  test("2. Backend API /api/user/update-elo applies 50% Elo reduction when hintUsed is true", async ({ request }) => {
    // Normal solve without hint: K=32, puzzle 1300, user 1200
    const normalRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: 1200,
        result: "win",
        hintUsed: false,
        isRequeued: false,
        guestId: "guest_test_hint",
      },
    });
    expect(normalRes.ok()).toBeTruthy();
    const normalData = await normalRes.json();
    const normalGain = normalData.eloChange;
    expect(normalGain).toBeGreaterThan(0);

    // Solve with hint used
    const hintRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: 1200,
        result: "win",
        hintUsed: true,
        isRequeued: false,
        guestId: "guest_test_hint",
      },
    });
    expect(hintRes.ok()).toBeTruthy();
    const hintData = await hintRes.json();
    const hintGain = hintData.eloChange;

    // Hint gain should be exactly 50% of normal gain (Math.round(normalGain * 0.5))
    expect(hintGain).toBe(Math.max(1, Math.round(normalGain * 0.5)));
    expect(hintGain).toBeLessThan(normalGain);
  });

  test("3. Backend API applies 25% Elo when both requeued and hintUsed are true", async ({ request }) => {
    const normalRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: 1200,
        result: "win",
        hintUsed: false,
        isRequeued: false,
        guestId: "guest_test_combo",
      },
    });
    const normalData = await normalRes.json();
    const normalGain = normalData.eloChange;

    const bothRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: 1300,
        currentUserElo: 1200,
        result: "win",
        hintUsed: true,
        isRequeued: true,
        guestId: "guest_test_combo",
      },
    });
    expect(bothRes.ok()).toBeTruthy();
    const bothData = await bothRes.json();
    const bothGain = bothData.eloChange;

    expect(bothGain).toBe(Math.max(1, Math.round(normalGain * 0.25)));
    expect(bothGain).toBeLessThanOrEqual(Math.round(normalGain * 0.5));
  });
});
