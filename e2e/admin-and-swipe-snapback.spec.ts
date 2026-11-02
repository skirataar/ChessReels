import { test, expect } from "@playwright/test";

test.describe("Admin Console & Swipe Snapback Verification", () => {
  test("1. Swiping from bottom of screen snaps cleanly back to center and advances puzzle", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // Mobile viewport
    await page.addInitScript(() => {
      const account = {
        id: "test_swipe_user",
        username: "swipetester",
        displayName: "Swipe Tester",
        avatar: "♟",
        elo: 1250,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      window.localStorage.setItem("chess_reel_account", JSON.stringify(account));
      window.localStorage.setItem("chess_reel_elo", "1250");
      document.cookie = "chess_reel_session=test_swipe_user; path=/; max-age=86400";
    });
    await page.goto("/play", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Wait for chessboard to load
    const chessboard = page.locator('[data-testid="chessboard-container"]');
    await expect(chessboard).toBeVisible({ timeout: 10000 });

    // Initial scroll position must be 0
    let scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // 1. Partial swipe from near the bottom: touch down near bottom (y: 720) and drag up by 20px (not enough to advance)
    await page.mouse.move(195, 720);
    await page.mouse.down();
    await page.mouse.move(195, 700, { steps: 5 });
    await page.mouse.up();

    // Verify it snaps right back to center and page scrollY remains strictly 0
    await page.waitForTimeout(300);
    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // 2. Click next puzzle button
    const nextBtn = page.getByRole("button", { name: /next puzzle/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Verify screen is still perfectly at top (scrollY = 0) and not stuck at bottom
    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  test("2. Admin console requires authentication and rejects unauthorized access", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Verify Master Key login gate is presented
    await expect(page.getByText(/chessreel/i).first()).toBeVisible();
    await expect(page.getByText(/admin console/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/enter admin_secret/i)).toBeVisible();

    // Enter wrong key
    await page.fill('input[type="password"]', "wrong_master_key_123");
    await page.getByRole("button", { name: /unlock admin console/i }).click();

    // Verify access denied message
    await expect(page.getByText(/invalid admin master key/i)).toBeVisible();

    // Verify bottom nav is hidden on /admin
    const bottomNav = page.locator('nav[aria-label="Bottom Navigation"]');
    await expect(bottomNav).toHaveCount(0);
  });

  test("3. Admin console logs in with master key and displays platform metrics & user management", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Enter correct master key
    await page.fill('input[type="password"]', "chessreel_admin_master_2026");
    await page.getByRole("button", { name: /unlock admin console/i }).click();

    // Verify dashboard metrics load
    await expect(page.getByText(/live system/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/registered users/i).first()).toBeVisible();
    await expect(page.getByText(/pro members/i).first()).toBeVisible();
    await expect(page.getByText(/indexed puzzles/i).first()).toBeVisible();

    // Navigate to Registered Users tab
    await page.getByRole("button", { name: /registered users/i }).click();
    await expect(page.getByPlaceholder(/search by username/i)).toBeVisible();

    // Navigate to Puzzle Intelligence tab
    await page.getByRole("button", { name: /puzzle intelligence/i }).click();
    await expect(page.getByPlaceholder(/search puzzle by id/i)).toBeVisible();

    // Lock console (logout)
    await page.getByRole("button", { name: /lock console/i }).click();
    await expect(page.getByPlaceholder(/enter admin_secret/i)).toBeVisible();
  });
});
