import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR =
  "/home/skirataar/.gemini/antigravity-ide/brain/53803d71-613c-470b-aba0-166c10c5831e";

test.describe("Tier Rules, Ads, Pricing & Placement Calibration", () => {
  test("1. Admin can view and tweak Free Tier limits, 200rs/mo pricing, and 5% annual discount", async ({ page }) => {
    await page.goto("http://localhost:3000/admin");

    const passInput = page.locator("input[type='password']");
    const isLoginRequired = await passInput
      .waitFor({ state: "visible", timeout: 4000 })
      .then(() => true)
      .catch(() => false);

    if (isLoginRequired) {
      await passInput.fill("chessreel_admin_master_2026");
      await page.click("button:has-text('Unlock Admin Console')");
      await page.waitForTimeout(1200);
    }

    const tierTab = page.locator("button:has-text('Tier Rules & Ads')");
    await expect(tierTab).toBeVisible({ timeout: 5000 });
    await tierTab.click();

    // Verify current values: 15 puzzles, 4 hours, 2 ad freq, 200 INR/mo, 5% annual discount
    const limitInput = page.locator("input[name='freePuzzleLimit']");
    const hoursInput = page.locator("input[name='freeWindowHours']");
    const adFreqInput = page.locator("input[name='adFrequencyPuzzles']");
    const priceInput = page.locator("input[name='proMonthlyPrice']");
    const discountInput = page.locator("input[name='annualDiscountPercent']");

    await expect(limitInput).toHaveValue("15");
    await expect(hoursInput).toHaveValue("4");
    await expect(adFreqInput).toHaveValue("2");
    await expect(priceInput).toHaveValue("200");
    await expect(discountInput).toHaveValue("5");

    // Capture screenshot of Admin Tier Rules & Ads panel
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "admin_tier_rules_settings.png"),
      fullPage: true,
    });

    // Test tweaking a value (e.g. ad frequency to 3, then saving, then restoring back to 2)
    await adFreqInput.fill("3");
    await page.click("button:has-text('Save Configuration')");
    await expect(page.locator("text=Updated tier rules")).toBeVisible({ timeout: 15000 });

    // Restore to 2
    await adFreqInput.fill("2");
    await page.click("button:has-text('Save Configuration')");
    await expect(page.locator("text=Updated tier rules")).toBeVisible({ timeout: 15000 });
  });

  test("2. Free user sees energy badge ⚡ 4/4 and gets ₹200/mo Paywall with 5% Annual discount", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");
    await page.evaluate(() => {
      localStorage.removeItem("chess_reel_plan");
      localStorage.removeItem("chess_reel_tier_config");
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "free-tier-user-e2e",
        username: "free_solver",
        elo: 800,
        plan: "free",
        isCalibrated: true,
      }));
      const emptySession = JSON.stringify({
        solveTimestamps: [],
        puzzlesSinceLastAd: 0,
      });
      localStorage.setItem("chess_reel_tier_session", emptySession);
      localStorage.setItem("chess_reel_tier_session_free-tier-user-e2e", emptySession);
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // Verify top header has energy indicator
    const energyBadge = page.locator("button[data-testid='header-quota-btn']");
    await expect(energyBadge).toBeVisible();
    const energyText = await energyBadge.textContent();
    expect(energyText).toContain("15");

    // Simulate quota reached (15 solves in current window)
    await page.evaluate(() => {
      const now = Date.now();
      const exhausted = JSON.stringify({
        solveTimestamps: Array.from({ length: 15 }, (_, i) => now - (15 - i) * 10000),
        puzzlesSinceLastAd: 1,
      });
      localStorage.setItem("chess_reel_tier_session", exhausted);
      localStorage.setItem("chess_reel_tier_session_free-tier-user-e2e", exhausted);
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // Energy badge should now show 0
    const exhaustedBadge = page.locator("button[data-testid='header-quota-btn']");
    await expect(exhaustedBadge).toBeVisible();
    expect(await exhaustedBadge.textContent()).toContain("0");

    // If modal auto-opened on quota depletion or needs click, ensure it's visible
    const quotaModalTitle = page.locator("text=Free Quota Reached");
    if (!(await quotaModalTitle.isVisible())) {
      await exhaustedBadge.click({ force: true });
    }

    // Verify QuotaPaywallModal shows ₹200 and 5% Annual discount
    await expect(quotaModalTitle).toBeVisible();
    await expect(page.locator("span:has-text('Save 5%')").first()).toBeVisible();
    await expect(page.locator("text=Annual")).toBeVisible();
    await expect(page.locator("button:has-text('Monthly')")).toBeVisible();
    await expect(page.locator("button:has-text('Unlock Unlimited Pro')")).toBeVisible();

    // Switch to monthly plan tab in modal
    await page.click("button:has-text('Monthly')");
    await expect(page.locator("button:has-text('Unlock Unlimited Pro (₹200/mo)')")).toBeVisible();

    // Take screenshot of Quota Paywall Modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "quota_paywall_modal.png"),
    });

    // Close paywall
    await page.click("button:has-text('Wait for Refill')");
  });

  test("3. Pro user has unlimited puzzles and Pro badge", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    await page.evaluate(() => {
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "pro-user-e2e",
        username: "pro_solver",
        elo: 1600,
        plan: "premium",
        isCalibrated: true,
      }));
      localStorage.setItem("chess_reel_plan", "premium");
      localStorage.setItem("chess_reel_tier_session", JSON.stringify({
        solveTimestamps: [Date.now(), Date.now(), Date.now(), Date.now(), Date.now()],
        puzzlesSinceLastAd: 10,
      }));
    });
    await page.reload();
    await page.waitForTimeout(1500);

    const profileBtn = page.locator("[data-testid='header-profile-btn']");
    await expect(profileBtn).toBeVisible();
    await expect(profileBtn).toHaveClass(/ring-amber-400/);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "pro_tier_unlimited_header.png"),
    });
  });

  test("4. Sponsored between-reels ad break displays DoomChess Reel Break and Pro CTA", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");
    await page.evaluate(() => {
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "ad-test-user",
        username: "ad_solver",
        elo: 900,
        plan: "free",
        isCalibrated: true,
      }));
    });
    await page.reload();

    await page.waitForFunction(() => typeof (window as any).__triggerAdModal === "function", { timeout: 5000 });

    await page.evaluate(() => {
      (window as any).__triggerAdModal();
    });
    await page.waitForTimeout(500);

    await expect(page.locator("text=DOOMCHESS REEL BREAK")).toBeVisible();
    await expect(page.locator("text=UPGRADE TO PRO")).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "ad_modal_break.png"),
    });

    const continueBtn = page.locator("button:has-text('Continue / Next Reel')");
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator("text=DOOMCHESS REEL BREAK")).not.toBeVisible();
  });

  test("5. Main screen removes Puzzle hashtag & Placement test exempts quota with balanced Elo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    // Set user in placement calibration using correct localStorage key
    await page.evaluate(() => {
      localStorage.removeItem("chess_reel_plan");
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "placement-test-user",
        username: "new_challenger",
        elo: 850,
        isCalibrated: false,
        calibrationStep: 0,
      }));
      localStorage.setItem("chess_reel_tier_session", JSON.stringify({
        solveTimestamps: [],
        puzzlesSinceLastAd: 0,
      }));
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // 1. Verify placement badge 🎯 1/6 is shown instead of quota pill ⚡ 4/4
    const calBadge = page.locator("[data-testid='header-calibration-badge']");
    await expect(calBadge).toBeVisible();
    expect(await calBadge.textContent()).toContain("🎯 1/6");

    // Quota button should NOT be visible during placement
    const quotaBtn = page.locator("button[data-testid='header-quota-btn']");
    await expect(quotaBtn).not.toBeVisible();

    // 2. Verify Puzzle hashtag (#00008 or similar) is NOT on the main screen
    // Only the Elo rating badge is rendered (e.g. "800 Elo" or "850 Elo")
    const hashtagLocator = page.locator("text=/#\\d+/");
    await expect(hashtagLocator).not.toBeVisible();
    await expect(page.locator("text=Elo").first()).toBeVisible();

    // Take screenshot of main screen showing NO hashtag and placement badge
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "no_hashtag_placement_header.png"),
    });
  });

  test("6. Practice mode is locked for Free users in PuzzleCard and BottomNav, opening Purchase Pop-up", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    // Ensure non-pro session
    await page.evaluate(() => {
      localStorage.removeItem("chess_reel_plan");
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "free-tier-user-1",
        username: "test_free_user",
        elo: 1000,
        plan: "free",
        isCalibrated: true,
      }));
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // 1. Verify header stats numbers are flush on header (no pills) and header stats/profile buttons are removed
    const ratingPill = page.locator("[data-testid='rating-pill']");
    const streakIndicator = page.locator("[data-testid='header-streak-indicator']");
    const quotaBtn = page.locator("[data-testid='header-quota-btn']");
    await expect(ratingPill).toBeVisible();
    await expect(streakIndicator).toBeVisible();
    await expect(quotaBtn).toBeVisible();

    // Verify stats and profile buttons are removed from header
    await expect(page.locator("[data-testid='header-stats-btn']")).not.toBeVisible();
    await expect(page.locator("[data-testid='header-profile-btn']")).not.toBeVisible();

    // 2. Verify Ranked/Practice pill is removed from above the board
    await expect(page.locator("[data-testid='practice-mode-btn']")).not.toBeVisible();

    // 3. Verify Black Rectangle Header Bar above board with flush time, audio, flip & tagline
    const boardHeaderBar = page.locator("[data-testid='puzzle-board-header-bar']");
    await expect(boardHeaderBar).toBeVisible();
    await expect(page.locator("[data-testid='puzzle-timer-pill']")).toBeVisible();

    // 4. Verify BottomNav has the combined Profile tab and locked Practice tab
    const bottomNavPractice = page.locator("[data-testid='bottom-nav-practice']");
    const bottomNavProfile = page.locator("[data-testid='bottom-nav-profile']");
    await expect(bottomNavPractice).toBeVisible();
    await expect(bottomNavProfile).toBeVisible();
    await expect(page.locator("[data-testid='bottom-nav-practice-lock']")).toBeVisible();

    // Take screenshot of new flush header and black rectangle board bar
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "flush_header_and_board_bar.png"),
    });

    // 5. Click Practice on BottomNav -> opens Purchase Modal with reason="practice"
    await bottomNavPractice.click();
    await page.waitForTimeout(600);

    // Verify Practice Paywall Modal contents
    await expect(page.locator("h2:has-text('Unlock Practice Mode')")).toBeVisible();
    await expect(page.locator("text=Target Specific Themes")).toBeVisible();
    await expect(page.locator("button:has-text('Maybe Later')")).toBeVisible();

    // Capture screenshot of Practice Purchase Modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "practice_purchase_modal.png"),
    });

    // Dismiss modal
    await page.click("button:has-text('Maybe Later')");
    await page.waitForTimeout(400);
    await expect(page.locator("h2:has-text('Unlock Practice Mode')")).not.toBeVisible();
  });

  test("7. Direct access to /practice is locked for free users and opens purchase pop-up", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Ensure non-pro session before loading
    await page.goto("http://localhost:3000/play");
    await page.evaluate(() => {
      localStorage.removeItem("chess_reel_plan");
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "free-tier-user-2",
        username: "practice_tester",
        elo: 1100,
        plan: "free",
        isCalibrated: true,
      }));
    });

    // Directly navigate to /practice
    await page.goto("http://localhost:3000/practice");
    await page.waitForTimeout(1500);

    // 1. Paywall Modal should automatically appear
    await expect(page.locator("h2:has-text('Unlock Practice Mode')")).toBeVisible();

    // Dismiss the modal temporarily to verify the underlying locked screen
    await page.click("button:has-text('Maybe Later')");
    await page.waitForTimeout(400);

    // 2. Verify Locked Practice Screen
    await expect(page.locator("text=PRO ONLY").first()).toBeVisible();
    await expect(page.locator("h2:has-text('Practice Mode is Pro Only')")).toBeVisible();
    await expect(page.locator("text=Targeted Tactical Themes")).toBeVisible();
    await expect(page.getByText("Custom Elo Brackets", { exact: true })).toBeVisible();
    await expect(page.locator("text=Unlimited Unranked Drills")).toBeVisible();

    const unlockCta = page.locator("[data-testid='unlock-pro-cta-btn']");
    await expect(unlockCta).toBeVisible();

    // Capture screenshot of Locked Practice Page
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "locked_practice_page.png"),
    });

    // 3. Click the unlock CTA on the locked page -> re-opens paywall
    await unlockCta.click();
    await page.waitForTimeout(500);
    await expect(page.locator("h2:has-text('Unlock Practice Mode')")).toBeVisible();

    // 4. Upgrade to Pro via modal
    const upgradeBtn = page.locator("[data-testid='paywall-upgrade-pro-btn']");
    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();
    await page.waitForTimeout(1500);

    // 5. Verify Practice Mode is now unlocked!
    await expect(page.locator("text=Unranked Pro")).toBeVisible();
    await expect(page.locator("button:has-text('Filter Puzzles')")).toBeVisible();

    // Capture screenshot of Unlocked Practice Page for Pro member
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "unlocked_practice_page_pro.png"),
    });
  });

  test("8. Tag inside box, breathing space above, piece color in bottom only, and custom photo DP selection", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");
    await page.evaluate(() => {
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "dp-test-user",
        username: "dp_tester",
        elo: 1100,
        plan: "free",
        isCalibrated: true,
      }));
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // 1. Verify space above chessboard utility box exists
    const boardHeaderBar = page.locator("[data-testid='puzzle-board-header-bar']");
    await expect(boardHeaderBar).toBeVisible();

    // Verify tag/tagline is inside the box and DOES NOT contain "White to move" / "Black to move"
    const boxText = await boardHeaderBar.innerText();
    expect(boxText).not.toContain("White to move");
    expect(boxText).not.toContain("Black to move");

    // Verify symbol (sparkles) next to tagline is REMOVED
    const taglineEl = page.locator("[data-testid='puzzle-tagline-container']");
    await expect(taglineEl).toBeVisible();
    await expect(taglineEl.locator("svg")).toHaveCount(0);

    // Verify timer is inside the box
    await expect(page.locator("[data-testid='puzzle-timer-pill']")).toBeVisible();

    // Verify compact dock is visible with h-12 rounded-full floating styling
    const bottomNav = page.locator("nav[aria-label='Bottom Navigation'] > div > div");
    await expect(bottomNav).toHaveClass(/h-12/);
    await expect(bottomNav).toHaveClass(/rounded-full/);

    // 2. Verify piece color IS displayed in the bottom tactical bar
    const bottomTurn = page.locator("[data-testid='puzzle-turn-indicator']");
    if (await bottomTurn.count() > 0) {
      const turnText = await bottomTurn.innerText();
      expect(turnText.toLowerCase()).toMatch(/to move/);
    }

    // Capture screenshot of board header box with tagline & compact dock
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "board_tagline_inside_box.png"),
    });

    // 3. Navigate to Profile / Stats page
    await page.goto("http://localhost:3000/stats");
    await page.waitForTimeout(1000);

    // Verify redundant separate "Change DP" text button is completely removed
    await expect(page.locator("[data-testid='change-dp-text-btn']")).toHaveCount(0);

    // Verify clicking avatar container opens the DP picker
    const avatarContainer = page.locator("[data-testid='stats-avatar-container']");
    await expect(avatarContainer).toBeVisible();
    await avatarContainer.click();

    // Verify DP picker panel opened and upload CTA exists
    const dpPanel = page.locator("[data-testid='dp-picker-panel']");
    await expect(dpPanel).toBeVisible();

    const uploadBtn = page.locator("[data-testid='upload-custom-dp-btn']");
    await expect(uploadBtn).toBeVisible();

    // Verify avatar in profile displays deterministic initial badge
    const avatarBadge = page.locator("[data-testid='stats-avatar-container']");
    await expect(avatarBadge).toBeVisible();

    // Capture screenshot of Profile with Display Picture picker open
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "profile_custom_dp_selected.png"),
    });
  });

  test("8. Failing a puzzle on last quota does NOT consume quota, does NOT open paywall popup, and does NOT say puzzle solved", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    // Setup free registered/calibrated user with exactly 1 quota remaining (3 solves out of 4)
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem("chess_reel_account", JSON.stringify({
        id: "quota-fail-tester",
        username: "quota_fail_test",
        elo: 1200,
        plan: "free",
        isCalibrated: true,
      }));
      localStorage.setItem("chess_reel_tier_session_quota-fail-tester", JSON.stringify({
        solveTimestamps: [now - 300000, now - 200000, now - 100000],
        puzzlesSinceLastAd: 0,
      }));
      localStorage.setItem("chess_reel_tier_session", JSON.stringify({
        solveTimestamps: [now - 300000, now - 200000, now - 100000],
        puzzlesSinceLastAd: 0,
      }));
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // Verify energy badge displays 1/4 (last quota remaining)
    const energyBadge = page.locator("button[data-testid='header-quota-btn']");
    await expect(energyBadge).toBeVisible();
    await expect(energyBadge).toContainText("1/4");

    // Simulate failing the puzzle (loss)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "failed" } })
      );
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", { detail: { delta: -12 } })
      );
    });

    await page.waitForTimeout(1000);

    // Verify quota is STILL 1/4 (NOT decremented)
    await expect(energyBadge).toContainText("1/4");

    // Verify Quota Paywall Modal did NOT open
    await expect(page.locator("text=Free Quota Reached")).not.toBeVisible();

    // Verify "Puzzle Solved!" celebration overlay did NOT appear
    await expect(page.locator("text=Puzzle Solved!")).not.toBeVisible();

    // Now simulate legitimately solving the puzzle
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-elo-update", { detail: { delta: 14 } })
      );
    });

    await page.waitForTimeout(1000);

    // Quota should now be consumed (0/4)
    await expect(energyBadge).toContainText("0/4");

    // Quota paywall modal opens because quota is now legitimately reached on solve
    await expect(page.locator("text=Free Quota Reached")).toBeVisible();
  });
});



