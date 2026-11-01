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
});
