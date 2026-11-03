import { test, expect } from "@playwright/test";

test.describe("Quota Count on Solved Only & No Glitch on Failed", () => {
  test("1. Failing a puzzle on last quota does NOT consume quota, does NOT open paywall popup, and does NOT say puzzle solved", async ({
    page,
    request,
  }) => {
    // 1. Create a fresh free calibrated user
    const username = `quota_${Date.now().toString().slice(-8)}`;
    const createRes = await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Quota Tester",
        elo: 1200,
        startingElo: 1200,
        isCalibrated: true,
        calibrationStep: 6,
      },
    });
    expect(createRes.ok()).toBe(true);
    const { user } = await createRes.json();

    // 2. Sign in via entry gate
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // Ensure account in localStorage is marked calibrated
    await page.evaluate((u) => {
      const acc = {
        ...u,
        isCalibrated: true,
        calibrationStep: 6,
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(acc));
      window.dispatchEvent(new Event("account-updated"));
    }, user);
    await page.reload();
    await page.waitForTimeout(1000);

    // Wait for chessboard to be rendered
    await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });

    // 3. Setup user with exactly 1 quota remaining
    const energyBadge = page.locator("button[data-testid='header-quota-btn']");
    await expect(energyBadge).toBeVisible({ timeout: 10000 });
    const badgeText = (await energyBadge.textContent()) || "";
    // badgeText is e.g. "⚡4/4" or "⚡5/5"
    const match = badgeText.match(/(\d+)\/(\d+)/);
    const limit = match ? parseInt(match[2], 10) : 4;
    const solvesToLeaveOne = limit - 1;

    // Seed the user's tier session with (limit - 1) solves
    await page.evaluate(
      ({ userId, count }) => {
        const now = Date.now();
        const timestamps: number[] = [];
        for (let i = 0; i < count; i++) {
          timestamps.push(now - (count - i) * 60000);
        }
        const session = {
          solveTimestamps: timestamps,
          puzzlesSinceLastAd: 0,
        };
        localStorage.setItem(`chess_reel_tier_session_${userId}`, JSON.stringify(session));
        localStorage.setItem("chess_reel_tier_session", JSON.stringify(session));
        window.dispatchEvent(new Event("tier-session-updated"));
      },
      { userId: user.id, count: solvesToLeaveOne }
    );

    // Verify energy badge now shows 1 remaining (e.g. 1/4 or 1/5)
    await expect(energyBadge).toContainText(`1/${limit}`);

    // 4. Simulate failing the puzzle (wrong move / loss)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "failed" } })
      );
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", { detail: { delta: -12 } })
      );
    });

    await page.waitForTimeout(1000);

    // 5. CRITICAL VERIFICATION:
    // a) Quota must NOT be decremented — must still show 1 remaining
    await expect(energyBadge).toContainText(`1/${limit}`);

    // b) Quota Paywall Modal must NOT be open
    await expect(page.locator("text=Free Quota Reached")).not.toBeVisible();

    // c) Celebration overlay must NOT say "Puzzle Solved!"
    await expect(page.locator("text=Puzzle Solved!")).not.toBeVisible();

    // 6. Now simulate legitimately solving the puzzle (winning move)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", { detail: { delta: 14 } })
      );
    });

    await page.waitForTimeout(1000);

    // 7. On legitimate solve:
    // a) Quota is now consumed to 0
    await expect(energyBadge).toContainText(`0/${limit}`);

    // b) Quota paywall modal opens because quota is depleted
    await expect(page.locator("text=Free Quota Reached")).toBeVisible();
  });
});
