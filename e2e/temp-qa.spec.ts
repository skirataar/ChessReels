import { test, expect } from "@playwright/test";

test.describe("Temp QA Test Harness Page (/temp-qa)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/temp-qa");
    await page.waitForLoadState("networkidle");
  });

  test("Module 1: Onboarding Pill renders within 390px without overflow, and Pro Upsell Modal works", async ({
    page,
  }) => {
    // 1. Verify pill renders correctly
    const pill = page.locator('[data-testid="onboarding-summary-pill"]');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Starting: 1200 Elo");
    await expect(pill).toContainText("Target: 1800 Elo");

    // Verify container max width is 390px
    const container = page.locator('[data-testid="onboarding-pill-container"]');
    const box = await container.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }

    // 2. Launch Pro Upsell Modal
    const launchBtn = page.locator('[data-testid="trigger-pro-upsell-btn"]');
    await launchBtn.click();

    const modal = page.locator('[data-testid="pro-upsell-screen"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Unlock GM Training");
    await expect(modal).toContainText("PRO ACCESS");

    // Click "Continue with Free Account"
    const freeBtn = page.locator('[data-testid="pro-upsell-free-btn"]');
    await freeBtn.click();

    // Verify modal is closed and feedback displayed
    await expect(modal).not.toBeVisible();
    const feedback = page.locator('[data-testid="upsell-feedback-banner"]');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Continue with Free Account");
  });

  test("Module 2: Auth Cache & Account Switch isolates queues and clears all cache", async ({
    page,
  }) => {
    // 1. Simulate Account A (2100 Elo)
    const accABtn = page.locator('[data-testid="sim-account-a-btn"]');
    await accABtn.click();

    const banner = page.locator('[data-testid="cache-action-banner"]');
    await expect(banner).toContainText("Switched to GM_Magnus");

    const storageList = page.locator('[data-testid="storage-keys-list"]');
    await expect(storageList).toContainText("chess_reel_account");
    await expect(storageList).toContainText("chess_reel_puzzle_queue_user_magnus_2100");

    // 2. Simulate Account B (1300 Elo)
    const accBBtn = page.locator('[data-testid="sim-account-b-btn"]');
    await accBBtn.click();
    await expect(banner).toContainText("Switched to ClubPlayer_Bob");
    await expect(storageList).toContainText("chess_reel_puzzle_queue_user_bob_1300");

    // 3. Test Logout & Clear Cache
    const logoutBtn = page.locator('[data-testid="test-logout-clear-cache-btn"]');
    await logoutBtn.click();
    await expect(banner).toContainText("Full cache flushed");
    await expect(storageList).toContainText("No active cache keys found");
  });

  test("Module 3: Spaced Repetition and Puzzle Queue loop prevention", async ({
    page,
  }) => {
    const activeCard = page.locator('[data-testid="active-puzzle-card"]');
    await expect(activeCard).toContainText("p_101");

    // Simulate solve on p_101
    const solveBtn = page.locator('[data-testid="simulate-solve-btn"]');
    await solveBtn.click();

    // Must advance to p_102 without looping
    await expect(activeCard).toContainText("p_102");
    await expect(activeCard).not.toContainText("p_101");

    // Simulate fail on p_102 -> re-inserts 10-14 positions ahead
    const failBtn = page.locator('[data-testid="simulate-fail-btn"]');
    await failBtn.click();

    // Must advance to p_103
    await expect(activeCard).toContainText("p_103");

    // Verify re-inserted clone exists in the queue
    const queueList = page.locator('[data-testid="puzzle-queue-list"]');
    await expect(queueList).toContainText("p_102_repeat");
    await expect(queueList).toContainText("Re-insert");
  });

  test("Module 4: Auto-Swipe toggle and 7s idle indicator", async ({
    page,
  }) => {
    // 1. Toggle auto-advance
    const toggle = page.locator('[data-testid="auto-advance-toggle"]');
    await toggle.click(); // enables
    let stored = await page.evaluate(() => localStorage.getItem("chess_reel_auto_advance"));
    expect(stored).toBe("true");

    await toggle.click(); // disables
    stored = await page.evaluate(() => localStorage.getItem("chess_reel_auto_advance"));
    expect(stored).toBe("false");

    // 2. Start timer and fast-forward
    const ffBtn = page.locator('[data-testid="fast-forward-7s-btn"]');
    await ffBtn.click();

    const chevron = page.locator('[data-testid="idle-swipe-indicator"]');
    await expect(chevron).toBeVisible();
    await expect(chevron).toContainText("Swipe up for next puzzle");

    // Clicking chevron dismisses it
    await chevron.click();
    await expect(chevron).not.toBeVisible();
  });

  test("Module 5: Placement feedback banner and transient Elo delta animation", async ({
    page,
  }) => {
    // 1. Trigger placement correct
    const correctBtn = page.locator('[data-testid="trigger-placement-correct-btn"]');
    await correctBtn.click();

    const banner = page.locator('[data-testid="qa-placement-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Correct!");

    // Wait 1.3s for placement banner to auto-clear
    await page.waitForTimeout(1400);
    await expect(banner).not.toBeVisible();

    // 2. Trigger Elo delta +14
    const plus14Btn = page.locator('[data-testid="trigger-plus-14-btn"]');
    await plus14Btn.click();

    const deltaBadge = page.locator('[data-testid="qa-elo-delta-badge"]');
    await expect(deltaBadge).toBeVisible();
    await expect(deltaBadge).toContainText("+14");

    const ratingPill = page.locator('[data-testid="qa-rating-pill"]');
    await expect(ratingPill).toContainText("1414");

    // Verify delta badge auto-dismisses after 1.5s
    await page.waitForTimeout(1700);
    await expect(deltaBadge).not.toBeVisible();
    // But rating remains 1414
    await expect(ratingPill).toContainText("1414");
  });

  test("Module 6: Streak and 2-Day Streak Freeze Simulator", async ({
    page,
  }) => {
    const streakInd = page.locator('[data-testid="qa-streak-indicator"]');
    const freezeInd = page.locator('[data-testid="qa-freeze-indicator"]');

    await expect(streakInd).toContainText("5 Days");
    await expect(freezeInd).toContainText("1/2 Freezes");

    // 1. Advance +1 day solve
    const plus1Btn = page.locator('[data-testid="streak-plus-one-day-btn"]');
    await plus1Btn.click();
    await expect(streakInd).toContainText("6 Days");

    // 2. Miss 1 day: should consume 1 freeze and preserve streak (6 + 1 = 7 days)
    const miss1Btn = page.locator('[data-testid="streak-miss-1-day-btn"]');
    await miss1Btn.click();
    await expect(freezeInd).toContainText("0/2 Freezes");
    await expect(streakInd).toContainText("7 Days");

    // 3. Miss 3 days: exceeds protection, resets streak to 1
    const miss3Btn = page.locator('[data-testid="streak-miss-3-days-btn"]');
    await miss3Btn.click();
    await expect(streakInd).toContainText("1 Days");
  });
});

