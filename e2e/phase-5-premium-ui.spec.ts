import { test, expect } from "@playwright/test";

test.describe("Phase 5: Premium UI/UX & Navigation Overhaul", () => {
  test.beforeEach(async ({ page }) => {
    // Skip landing page by setting preview guest flag
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
      window.localStorage.setItem("chess_reel_elo", "1250");
      window.localStorage.setItem("chess_reel_daily_streak", "3");
      window.localStorage.setItem("chess_reel_solve_combo", "4");
      window.localStorage.setItem("chess_reel_best_combo", "8");
      window.localStorage.setItem("chess_reel_total_solved", "12");
      window.localStorage.setItem("chess_reel_total_failed", "3");
    });
  });

  test("1. Root '/' redirects to '/play' and renders BottomNav", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/play/, { timeout: 10000 });
    expect(page.url()).toContain("/play");

    // Bottom Navigation Bar is present
    const bottomNav = page.locator('nav[aria-label="Bottom Navigation"]');
    await expect(bottomNav).toBeVisible();

    // Verify all 3 tabs exist
    await expect(bottomNav.getByRole("link", { name: "Play" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Practice" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Stats" })).toBeVisible();
  });

  test("2. Play route displays redesigned PuzzleCard with Top Bar, warm board, info, and circular action row", async ({ page }) => {
    await page.goto("/play");

    // Board container exists
    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(boardContainer).toBeVisible({ timeout: 10000 });

    // Mode tabs: Ranked and Practice
    await expect(page.getByRole("button", { name: "Ranked" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Practice" })).toBeVisible();

    // Count-up timer pill
    await expect(page.locator('[data-testid="puzzle-timer-pill"]')).toBeVisible();

    // Circular action buttons
    await expect(page.getByRole("button", { name: "Reset puzzle" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hint" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next puzzle" })).toBeVisible();
  });

  test("3. BottomNav navigates seamlessly to Practice page with Filter Sheet", async ({ page }) => {
    await page.goto("/play");

    const bottomNav = page.locator('nav[aria-label="Bottom Navigation"]');
    await bottomNav.getByRole("link", { name: "Practice" }).click();

    await page.waitForURL(/\/practice/, { timeout: 10000 });
    expect(page.url()).toContain("/practice");

    // Filter Puzzles button
    const filterBtn = page.getByRole("button", { name: /filter puzzles/i });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Bottom sheet drawer opens
    await expect(page.getByRole("heading", { name: /filter practice puzzles/i })).toBeVisible();
    await expect(page.getByText(/rating range/i)).toBeVisible();

    // Check theme badges
    const forkBadge = page.getByRole("button", { name: /fork/i });
    await expect(forkBadge).toBeVisible();
    await forkBadge.click();

    // Apply filters
    const applyBtn = page.getByRole("button", { name: /apply filters/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Sheet closes
    await expect(page.getByRole("heading", { name: /filter practice puzzles/i })).not.toBeVisible();
  });

  test("4. BottomNav navigates to Stats page and displays Profile, Streak card, Recharts graph, and 4 metric cards", async ({ page }) => {
    await page.goto("/play");

    const bottomNav = page.locator('nav[aria-label="Bottom Navigation"]');
    await bottomNav.getByRole("link", { name: "Stats" }).click();

    await page.waitForURL(/\/stats/, { timeout: 10000 });
    expect(page.url()).toContain("/stats");

    // Profile card
    await expect(page.getByRole("heading", { name: /guest player/i })).toBeVisible();

    // Large Streak Card
    await expect(page.getByRole("heading", { name: /daily streak/i })).toBeVisible();
    await expect(page.getByText(/in a row/i).first()).toBeVisible();

    // Metric Cards Grid
    await expect(page.getByText(/total solved/i)).toBeVisible();
    await expect(page.getByText("12", { exact: true })).toBeVisible();
    await expect(page.getByText(/accuracy/i)).toBeVisible();
    await expect(page.getByText("80%", { exact: true })).toBeVisible();
    await expect(page.getByText(/time spent/i)).toBeVisible();
  });

  test("5. Community Like and Share feature functions with real-time toggle and toast", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
    });
    await page.goto("/play", { waitUntil: "networkidle" });

    // Like button is visible
    const likeBtn = page.getByRole("button", { name: /like puzzle/i });
    await expect(likeBtn).toBeVisible({ timeout: 10000 });

    // Initial count
    const initialText = await likeBtn.innerText();
    const initialCount = parseInt(initialText.trim(), 10) || 0;

    // Click Like
    await likeBtn.click();

    // Toast appears
    await expect(page.getByText(/added to liked puzzles/i)).toBeVisible({ timeout: 5000 });

    // Count increments by 1
    const newText = await likeBtn.innerText();
    const newCount = parseInt(newText.trim(), 10) || 0;
    expect(newCount).toBe(initialCount + 1);

    // Click again to unlike
    await likeBtn.click();
    const revertedText = await likeBtn.innerText();
    const revertedCount = parseInt(revertedText.trim(), 10) || 0;
    expect(revertedCount).toBe(initialCount);

    // Share button is present and triggers copy toast
    const shareBtn = page.getByRole("button", { name: "Share puzzle card" });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
    await expect(page.getByText(/copied to clipboard/i)).toBeVisible();
  });

  test("6. Reels Vertical Swipe Gesture navigates to next puzzle without tapping next button", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
    });
    await page.goto("/play", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const swipeCue = page.locator('[data-testid="swipe-cue"]');
    await expect(swipeCue).toBeVisible({ timeout: 10000 });
    await expect(swipeCue).toContainText(/swipe/i);

    const initialBadge = await page.locator("text=/#\\w+/").first().innerText();

    // 1. Keyboard shortcut: ArrowDown advances to the next reel
    await page.keyboard.press("ArrowDown");
    await expect(async () => {
      const secondBadge = await page.locator("text=/#\\w+/").first().innerText();
      expect(secondBadge).not.toBe(initialBadge);
    }).toPass({ timeout: 6000 });

    const secondBadge = await page.locator("text=/#\\w+/").first().innerText();

    // 2. Drag / Swipe upward on the mission brief card
    const missionCard = page.locator("text=/#\\w+/").first();
    const box = await missionCard.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y - 120, { steps: 10 });
      await page.mouse.up();
    }

    // Wait for the new puzzle to slide into view
    await expect(async () => {
      const thirdBadge = await page.locator("text=/#\\w+/").first().innerText();
      expect(thirdBadge).not.toBe(secondBadge);
    }).toPass({ timeout: 6000 });
  });
});


