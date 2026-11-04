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
    await expect(storageList).toContainText("qa_mock_account");
    await expect(storageList).toContainText("qa_mock_puzzle_queue_user_magnus_2100");

    // 2. Simulate Account B (1300 Elo)
    const accBBtn = page.locator('[data-testid="sim-account-b-btn"]');
    await accBBtn.click();
    await expect(banner).toContainText("Switched to ClubPlayer_Bob");
    await expect(storageList).toContainText("qa_mock_puzzle_queue_user_bob_1300");

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
    const stateBadge = page.locator('[data-testid="qa-streak-state-badge"]');

    await expect(streakInd).toContainText("5 Days");
    await expect(freezeInd).toContainText("2/2 Freezes");
    await expect(stateBadge).toContainText("State C: Ignited Amber");

    // 1. Advance +1 day solve
    const plus1Btn = page.locator('[data-testid="streak-plus-one-day-btn"]');
    await plus1Btn.click();
    await expect(streakInd).toContainText("6 Days");
    await expect(stateBadge).toContainText("State C: Ignited Amber");

    // 2. Miss 1 day: should consume 1 freeze and strictly PRESERVE streak (stays 6 days, never increments to 7)
    const miss1Btn = page.locator('[data-testid="streak-miss-1-day-btn"]');
    await miss1Btn.click();
    await expect(freezeInd).toContainText("1/2 Freezes");
    await expect(streakInd).toContainText("6 Days");
    await expect(stateBadge).toContainText("State B: Icy Frozen");

    // 3. Miss 3 days: exceeds protection, resets streak strictly to 0
    const miss3Btn = page.locator('[data-testid="streak-miss-3-days-btn"]');
    await miss3Btn.click();
    await expect(streakInd).toContainText("0 Days");
    await expect(stateBadge).toContainText("State A: Hollow");
  });

  test("Module 6: Hollowed-Out vs. Ignited Flame states and 0 -> 1 Streak Ignition animation", async ({
    page,
  }) => {
    const streakInd = page.locator('[data-testid="qa-streak-indicator"]');
    const flameIcon = page.locator('[data-testid="qa-flame-icon"]');
    const stateBadge = page.locator('[data-testid="qa-streak-state-badge"]');

    // 1. Set streak to 0 (Hollowed-Out State)
    const setZeroBtn = page.locator('[data-testid="set-streak-zero-btn"]');
    await setZeroBtn.click();

    // Verify streak is 0
    await expect(streakInd).toContainText("0");
    await expect(stateBadge).toContainText("State A: Hollow");
    await page.waitForTimeout(450);
    const numDisplay = page.locator('[data-testid="streak-number-display"]');
    await expect(numDisplay).toHaveClass(/text-\[#78716c\]/);

    // Verify flame icon is hollowed out: fill="none", stroke="#78716c"
    await expect(flameIcon).toHaveAttribute("fill", "none");
    await expect(flameIcon).toHaveAttribute("stroke", "#78716c");

    // 2. Click "Test 0 -> 1 Streak Ignition"
    const igniteBtn = page.locator('[data-testid="test-streak-ignition-btn"]');
    await igniteBtn.click();

    // Verify pulse ring appears
    const pulseRing = page.locator('[data-testid="streak-ignition-pulse"]');
    await expect(pulseRing).toBeVisible();

    // Verify streak transitions to 1 in #f5f2eb
    await page.waitForTimeout(500);
    await expect(streakInd).toContainText("1");
    await expect(stateBadge).toContainText("State C: Ignited Amber");
    await expect(numDisplay).toHaveClass(/text-\[#f5f2eb\]/);

    // Verify flame is in ignited state: fill="#f59e0b", stroke="#fbbf24"
    await expect(flameIcon).toHaveAttribute("fill", "#f59e0b");
    await expect(flameIcon).toHaveAttribute("stroke", "#fbbf24");
  });

  test("Module 6: Three Visual States (Hollow, Icy Frozen with Snowflakes, Ignited Amber) and Freeze Thaw", async ({
    page,
  }) => {
    const streakInd = page.locator('[data-testid="qa-streak-indicator"]');
    const flameIcon = page.locator('[data-testid="qa-flame-icon"]');
    const stateBadge = page.locator('[data-testid="qa-streak-state-badge"]');
    const numDisplay = page.locator('[data-testid="streak-number-display"]');

    // 1. Test Missed Day -> Icy Frozen State
    const frozenBtn = page.locator('[data-testid="test-missed-day-frozen-btn"]');
    await frozenBtn.click();
    await page.waitForTimeout(450);

    await expect(stateBadge).toContainText("State B: Icy Frozen");
    await expect(flameIcon).toHaveAttribute("fill", "#38bdf8");
    await expect(flameIcon).toHaveAttribute("stroke", "#7dd3fc");

    // Snowflake accents must be visible
    const snowflakeTop = page.locator('[data-testid="frozen-snowflake-top"]');
    const snowflakeBottom = page.locator('[data-testid="frozen-snowflake-bottom"]');
    await expect(snowflakeTop).toBeVisible();
    await expect(snowflakeBottom).toBeVisible();
    await expect(numDisplay).toHaveClass(/text-\[#e0f2fe\]/);

    // 2. Test Solve on Frozen Day (Thaw Ice -> Amber +1)
    const thawBtn = page.locator('[data-testid="test-solve-frozen-thaw-btn"]');
    const currentStreakText = await numDisplay.textContent();
    const prevStreak = parseInt(currentStreakText || "7", 10);

    await thawBtn.click();
    await page.waitForTimeout(450);

    await expect(stateBadge).toContainText("State C: Ignited Amber");
    await expect(flameIcon).toHaveAttribute("fill", "#f59e0b");
    await expect(flameIcon).toHaveAttribute("stroke", "#fbbf24");
    // Snowflakes must be removed upon thawing
    await expect(snowflakeTop).not.toBeVisible();
    await expect(snowflakeBottom).not.toBeVisible();
    // Streak rolled up +1
    await expect(numDisplay).toContainText(String(prevStreak + 1));
    await expect(numDisplay).toHaveClass(/text-\[#f5f2eb\]/);

    // 3. Set Streak to 0 (State A: Hollow)
    const setZeroBtn = page.locator('[data-testid="set-streak-zero-btn"]');
    await setZeroBtn.click();
    await page.waitForTimeout(450);

    await expect(stateBadge).toContainText("State A: Hollow");
    await expect(flameIcon).toHaveAttribute("fill", "none");
    await expect(flameIcon).toHaveAttribute("stroke", "#78716c");
    await expect(numDisplay).toHaveClass(/text-\[#78716c\]/);
    await expect(streakInd).toContainText("0 Days");
  });

  test("Module 6: Multi-Day Miss, 30-Day Streak, Freezes 2->1->0 and 3rd Day Lapsed to 0", async ({
    page,
  }) => {
    const streakInd = page.locator('[data-testid="qa-streak-indicator"]');
    const freezeInd = page.locator('[data-testid="qa-freeze-indicator"]');
    const stateBadge = page.locator('[data-testid="qa-streak-state-badge"]');
    const numDisplay = page.locator('[data-testid="streak-number-display"]');

    // 1. Preset 30 Streak (2 Freezes)
    await page.getByTestId("load-scenario-30-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("30");
    await expect(freezeInd).toContainText("2/2 Freezes");
    await expect(stateBadge).toContainText("State C: Ignited Amber");

    // 2. Miss 1 Day -> Freezes at 30 with 1/2 freezes remaining
    await page.getByTestId("streak-miss-1-day-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("30");
    await expect(freezeInd).toContainText("1/2 Freezes");
    await expect(stateBadge).toContainText("State B: Icy Frozen");

    // 3. Solve Today -> Thaws ice, advances to 31, strictly preserves 1/2 freezes
    await page.getByTestId("streak-solve-today-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("31");
    await expect(freezeInd).toContainText("1/2 Freezes");
    await expect(stateBadge).toContainText("State C: Ignited Amber");

    // 4. Miss another day -> Freezes at 31 with 0/2 freezes remaining
    await page.getByTestId("streak-miss-1-day-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("31");
    await expect(freezeInd).toContainText("0/2 Freezes");
    await expect(stateBadge).toContainText("State B: Icy Frozen");

    // 5. Solve Today -> Thaws ice, advances to 32, 0/2 freezes
    await page.getByTestId("streak-solve-today-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("32");
    await expect(freezeInd).toContainText("0/2 Freezes");
    await expect(stateBadge).toContainText("State C: Ignited Amber");

    // 6. Test 2-Day consecutive miss: 30 -> 2 day miss -> 0 freezes left, still frozen at 30
    await page.getByTestId("load-scenario-30-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("streak-miss-2-days-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("30");
    await expect(freezeInd).toContainText("0/2 Freezes");
    await expect(stateBadge).toContainText("State B: Icy Frozen");

    // 7. On 3rd day miss -> strictly reset to 0!
    await page.getByTestId("streak-miss-1-day-btn").click();
    await page.waitForTimeout(300);
    await expect(numDisplay.last()).toHaveText("0");
    await expect(freezeInd).toContainText("0/2 Freezes");
    await expect(stateBadge).toContainText("State A: Hollow (0)");
  });

  test("Module 7: Database Test Account Cleanup & Inspector renders and supports selective / bulk deletion", async ({
    page,
  }) => {
    // 1. Verify Module 7 section is rendered
    const moduleSection = page.locator('[data-testid="module-db-cleanup"]');
    await expect(moduleSection).toBeVisible();
    await expect(moduleSection).toContainText("Database Test Account Cleanup & Live Inspector");

    // 2. Verify recent accounts table has loaded
    const purgeBtn = page.locator('[data-testid="purge-flagged-test-accounts-btn"]');
    await expect(purgeBtn).toBeVisible();

    const deleteSelBtn = page.locator('[data-testid="delete-selected-from-db-btn"]');
    await expect(deleteSelBtn).toBeVisible();
    // Initially disabled because 0 selected
    await expect(deleteSelBtn).toBeDisabled();

    // 3. Check select-all functionality
    const selectAllCheckbox = page.locator('[data-testid="select-all-accounts-checkbox"]');
    await expect(selectAllCheckbox).toBeVisible();
    await selectAllCheckbox.click();

    // After clicking select-all, delete button must be enabled
    await expect(deleteSelBtn).toBeEnabled();

    // Unselect all
    await selectAllCheckbox.click();
    await expect(deleteSelBtn).toBeDisabled();

    // 4. Test selecting a single account checkbox
    const firstUserCheckbox = page.locator('input[type="checkbox"][data-testid^="checkbox-user-"]').first();
    if (await firstUserCheckbox.isVisible()) {
      await firstUserCheckbox.click();
      await expect(deleteSelBtn).toBeEnabled();
      await expect(deleteSelBtn).toContainText("Delete Selected from DB (1)");
      await firstUserCheckbox.click();
      await expect(deleteSelBtn).toBeDisabled();
    }
  });
});

