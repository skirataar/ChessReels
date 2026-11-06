import { test, expect } from "@playwright/test";

test.describe("Placement Move Feedback & Transient Elo Change Animation", () => {
  test("1. Static Elo delta is removed from header HUD; transient floating badge appears on Elo change and unmounts after 1.5s", async ({
    page,
    request,
  }) => {
    const username = `elotest_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Elo Tester",
        elo: 1400,
        startingElo: 1400,
      },
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    const ratingPill = page.getByTestId("rating-pill");
    await expect(ratingPill).toBeVisible({ timeout: 10000 });

    // 1. Verify no permanent static '+Elo' / '-Elo' number exists in header rating pill initially
    const deltaBadge = page.getByTestId("elo-delta-badge");
    await expect(deltaBadge).not.toBeVisible();
    await expect(ratingPill).toContainText("1400");

    // 2. Trigger transient Elo increase (+14)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", { detail: { delta: 14 } })
      );
    });

    // Verify floating delta badge (+14) appears in emerald
    await expect(deltaBadge).toBeVisible();
    await expect(deltaBadge).toHaveText("+14");
    await expect(deltaBadge).toHaveClass(/text-\[#10b981\]/);

    // Verify main Elo counter updates smoothly to 1414 over ~600ms
    await expect(ratingPill).toContainText("1414", { timeout: 1000 });

    // 3. Hold briefly and verify delta badge auto-dismisses and unmounts after 1.5 seconds
    await page.waitForTimeout(1600);
    await expect(deltaBadge).not.toBeVisible();

    // Verify ONLY the updated Elo (1414) remains in the rating pill
    await expect(ratingPill).toContainText("1414");
    expect(await ratingPill.textContent()).not.toContain("+");

    // 4. Trigger transient Elo decrease (-11)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", { detail: { delta: -11, newElo: 1403 } })
      );
    });

    // Verify floating delta badge (-11) appears in crimson
    await expect(deltaBadge).toBeVisible();
    await expect(deltaBadge).toHaveText("-11");
    await expect(deltaBadge).toHaveClass(/text-\[#ef4444\]/);

    // Verify main Elo updates to 1403
    await expect(ratingPill).toContainText("1403", { timeout: 1000 });

    // Verify auto-dismissal after 1.5 seconds
    await page.waitForTimeout(1600);
    await expect(deltaBadge).not.toBeVisible();
    await expect(ratingPill).toContainText("1403");
  });

  test("2. Placement games show 'Correct!' status banner in emerald, highlights move, and pauses for 1.2s before next placement puzzle", async ({
    page,
    request,
  }) => {
    const username = `calib_win_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Placement Winner",
        elo: 1200,
        startingElo: 1200,
      },
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/placement test • puzzle 1 of 6/i)).toBeVisible();

    // Placement feedback banner should NOT be visible initially
    const banner = page.getByTestId("placement-feedback-banner");
    await expect(banner).not.toBeVisible();

    // Trigger finished winning move in calibration mode
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    // 1. Clearly show visual status banner "Correct!" in emerald #10b981
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Correct!");
    await expect(banner).toHaveClass(/text-\[#10b981\]/);

    // 2. Banner pauses for 1.2s before auto-transitioning
    await page.waitForTimeout(600);
    await expect(banner).toBeVisible(); // Still visible during the 1.2s pause

    // Wait until the 1.2s timer completes (600ms + 900ms = 1500ms > 1200ms)
    await page.waitForTimeout(900);
  });

  test("3. Placement games show 'Incorrect' status banner in crimson, highlights move, and does not silently auto-skip instantly", async ({
    page,
    request,
  }) => {
    const username = `calib_loss_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Placement Loss",
        elo: 1200,
        startingElo: 1200,
      },
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/placement test • puzzle 1 of 6/i)).toBeVisible();

    const banner = page.getByTestId("placement-feedback-banner");
    await expect(banner).not.toBeVisible();

    // Trigger finished wrong move in calibration mode
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "failed" } })
      );
    });

    // 1. Clearly show visual status banner "Incorrect" in crimson #ef4444
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Incorrect");
    await expect(banner).toHaveClass(/text-\[#ef4444\]/);

    // 2. User can swipe immediately to skip the remaining pause
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(400);
  });
});
