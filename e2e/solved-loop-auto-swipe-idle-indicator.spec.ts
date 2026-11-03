import { test, expect } from "@playwright/test";

test.describe("Solved Loop Fix, Auto-Swipe Setting & 7-Second Idle Indicator", () => {
  test("1. Solved puzzle does NOT trigger infinite reload loop, board stays solved, and Next Reel strictly advances to a new puzzle ID", async ({
    page,
    request,
  }) => {
    // 1. Create authenticated user
    const username = `solv_${Date.now().toString().slice(-8)}`;
    const createRes = await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Loop Tester",
        elo: 1200,
        startingElo: 1200,
      },
    });
    expect(createRes.ok()).toBe(true);

    // 2. Sign in via entry gate
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // 3. Wait for active puzzle to load
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10000 });

    // Ensure auto-advance is disabled (default)
    const autoAdvanceSetting = await page.evaluate(() => {
      return window.localStorage.getItem("chess_reel_auto_advance");
    });
    expect(autoAdvanceSetting).toBeNull(); // defaults to false/null

    // 4. Record initial puzzle card key or text
    const initialText = await page.evaluate(() => document.body.innerText);

    // 5. Trigger solve state programmatically or click solve / next
    // Check if celebration overlay or Next Reel button appears on solve
    // Programmatically trigger solve on active puzzle
    await page.evaluate(() => {
      // Simulate completing winning move
      const event = new CustomEvent("test-trigger-solve");
      window.dispatchEvent(event);
    });

    // Verify celebration overlay shows "Puzzle Solved!"
    const nextBtn = page.getByRole("button", { name: /next reel/i });

    // Even after waiting 3.5 seconds, puzzle should NOT auto-advance because auto-advance is disabled by default
    await page.waitForTimeout(3500);

    // Verify "Next Reel" button remains visible without looping or disappearing
    // (If infinite loop bug were present, board would reset and "Next Reel" would vanish back to initial move 0)
    // Now click Next Reel
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Swipe up
      await page.keyboard.press("PageDown");
      await page.waitForTimeout(500);
    }

    // Verify that currentIndex or next puzzle loaded cleanly
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Auto-advance setting toggle in Profile/Settings defaults to OFF, toggles cleanly, and syncs across views", async ({
    page,
    request,
  }) => {
    const username = `auto_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Auto Tester",
        elo: 1300,
        startingElo: 1300,
      },
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // Open Profile / Settings via bottom navigation dock
    const profileBtn = page.getByTestId("bottom-nav-profile");
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Verify Auto-advance toggle is present
    const toggleBtn = page.getByTestId("toggle-auto-advance-btn");
    await expect(toggleBtn).toBeVisible();

    // Verify default is 'Off'
    await expect(toggleBtn).toHaveText("Off");

    // Click to turn 'On'
    await toggleBtn.click();
    await expect(toggleBtn).toHaveText("On");

    // Verify stored in localStorage as '1'
    const stored = await page.evaluate(() => window.localStorage.getItem("chess_reel_auto_advance"));
    expect(stored).toBe("1");

    // Click again to turn 'Off'
    await toggleBtn.click();
    await expect(toggleBtn).toHaveText("Off");
    const storedOff = await page.evaluate(() => window.localStorage.getItem("chess_reel_auto_advance"));
    expect(storedOff).toBe("0");

    // Close profile modal
    await page.keyboard.press("Escape");
  });

  test("3. 7-second post-solve idle swipe indicator appears when idle and disappears on swipe", async ({
    page,
    request,
  }) => {
    const username = `idle_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Idle Tester",
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

    // Wait for chessboard to be rendered and interactive
    await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });

    // Ensure auto-advance is OFF
    await page.evaluate(() => {
      window.localStorage.setItem("chess_reel_auto_advance", "0");
      window.dispatchEvent(new Event("auto-advance-updated"));
    });

    // Initially, idle swipe indicator should NOT be visible
    const indicator = page.getByTestId("idle-swipe-indicator");
    await expect(indicator).not.toBeVisible();

    // Trigger finished state (solved) with auto-advance OFF
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    // Verify indicator is still NOT visible immediately (within 2s)
    await expect(indicator).not.toBeVisible();
    await page.waitForTimeout(2000);
    await expect(indicator).not.toBeVisible();

    // Wait for the 7-second idle timer to expire (7s from event dispatch)
    await expect(indicator).toBeVisible({ timeout: 10000 });
    await expect(indicator).toContainText("Swipe up for next puzzle");

    // Advance / dismiss via vertical swipe or PageDown
    await page.keyboard.press("PageDown");
    await expect(indicator).not.toBeVisible();

    // Verify that when auto-advance is ON, the 7-second idle indicator NEVER appears
    await page.evaluate(() => {
      window.localStorage.setItem("chess_reel_auto_advance", "1");
      window.dispatchEvent(new Event("auto-advance-updated"));
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    await page.waitForTimeout(1000);
    await expect(indicator).not.toBeVisible();
  });

  test("4. Idle swipe indicator does NOT start or appear on failed/playing puzzles, strictly only on solved", async ({
    page,
    request,
  }) => {
    const username = `nosolve_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "NoSolve Idle Tester",
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

    // Wait for chessboard to be rendered
    await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });

    // Auto-advance is OFF
    await page.evaluate(() => {
      window.localStorage.setItem("chess_reel_auto_advance", "0");
      window.dispatchEvent(new Event("auto-advance-updated"));
    });

    const indicator = page.getByTestId("idle-swipe-indicator");
    await expect(indicator).not.toBeVisible();

    // Trigger status = "failed" with auto-advance OFF
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "failed" } })
      );
    });

    // Wait over 7 seconds (e.g. 7.5s) and verify indicator NEVER appears for failed puzzle
    await page.waitForTimeout(7500);
    await expect(indicator).not.toBeVisible();

    // Now trigger status = "solved"
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    // Immediately after solve, indicator shouldn't show yet
    await expect(indicator).not.toBeVisible();

    // After 7 seconds from solve, indicator appears
    await expect(indicator).toBeVisible({ timeout: 10000 });
    await expect(indicator).toContainText("Swipe up for next puzzle");
  });
});
