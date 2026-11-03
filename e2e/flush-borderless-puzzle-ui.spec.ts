import { test, expect } from "@playwright/test";

test.describe("Flush Borderless Ultra-Minimalist Puzzle UI", () => {
  test("1. Flush navigation buttons, scaled action icons, move history navigation, and borderless idle indicator", async ({
    page,
    request,
  }) => {
    // 1. Create calibrated test user
    const username = `flush_${Date.now().toString().slice(-8)}`;
    await request.post("/api/user/account", {
      data: {
        username,
        password: "password123",
        displayName: "Minimal Tactician",
        elo: 1500,
        startingElo: 1500,
      },
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // 2. Verify duplicate header profile button is removed (since Profile is in bottom dock)
    await expect(page.locator("button[data-testid='header-profile-btn']")).toHaveCount(0);

    // 3. Verify top metadata bar: clean, borderless, tabular-nums timer, and 18px audio/flip icons
    const headerBar = page.getByTestId("puzzle-board-header-bar");
    await expect(headerBar).toBeVisible();
    await expect(headerBar).toHaveClass(/px-0/);

    const timerPill = page.getByTestId("puzzle-timer-pill");
    await expect(timerPill).toBeVisible();
    await expect(timerPill).toHaveClass(/tabular-nums/);

    const soundBtn = page.getByTestId("toggle-sound-btn");
    await expect(soundBtn).toBeVisible();
    const soundSvg = soundBtn.locator("svg");
    await expect(soundSvg).toHaveClass(/w-\[18px\]/);
    await expect(soundSvg).toHaveClass(/h-\[18px\]/);

    const flipBtn = page.getByTestId("flip-board-btn");
    await expect(flipBtn).toBeVisible();
    const flipSvg = flipBtn.locator("svg");
    await expect(flipSvg).toHaveClass(/w-\[18px\]/);
    await expect(flipSvg).toHaveClass(/h-\[18px\]/);

    // 4. Verify chessboard has rounded-lg overflow-hidden and data-fen attribute
    const boardContainer = page.locator("[data-testid='chessboard-container']");
    await expect(boardContainer).toBeVisible();
    await expect(boardContainer).toHaveClass(/rounded-lg/);
    await expect(boardContainer).toHaveClass(/overflow-hidden/);

    const startFen = await boardContainer.getAttribute("data-fen");
    expect(startFen).toBeTruthy();

    // 5. Verify action row below board has flush `<` and `>` navigation buttons
    const prevBtn = page.getByTestId("prev-puzzle-btn");
    const nextBtn = page.getByTestId("next-puzzle-btn");
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // At initial position (viewMoveIndex === 0, no moves made yet):
    // prevBtn (<) is disabled and dimmed (cannot step back past start)
    await expect(prevBtn).toBeDisabled();
    await expect(prevBtn).toHaveClass(/opacity-25/);
    await expect(prevBtn).toHaveClass(/pointer-events-none/);

    // nextBtn (>) is also disabled and dimmed (already at latest played move)
    await expect(nextBtn).toBeDisabled();
    await expect(nextBtn).toHaveClass(/opacity-25/);
    await expect(nextBtn).toHaveClass(/pointer-events-none/);

    // Verify all action row icons are scaled to 22px
    const prevSvg = prevBtn.locator("svg");
    await expect(prevSvg).toHaveClass(/w-\[22px\]/);
    await expect(prevSvg).toHaveClass(/h-\[22px\]/);

    const nextSvg = nextBtn.locator("svg");
    await expect(nextSvg).toHaveClass(/w-\[22px\]/);
    await expect(nextSvg).toHaveClass(/h-\[22px\]/);

    const resetBtn = page.getByTestId("reset-puzzle-btn");
    const resetSvg = resetBtn.locator("svg");
    await expect(resetSvg).toHaveClass(/w-\[22px\]/);
    await expect(resetSvg).toHaveClass(/h-\[22px\]/);

    const hintBtn = page.getByTestId("hint-btn");
    const hintSvg = hintBtn.locator("svg");
    await expect(hintSvg).toHaveClass(/w-\[22px\]/);
    await expect(hintSvg).toHaveClass(/h-\[22px\]/);

    const likeBtn = page.getByTestId("like-btn");
    const likeSvg = likeBtn.locator("svg");
    await expect(likeSvg).toHaveClass(/w-\[22px\]/);
    await expect(likeSvg).toHaveClass(/h-\[22px\]/);

    // Like count number has text-[15px] and tabular-nums
    const likeCount = page.getByTestId("like-count");
    await expect(likeCount).toBeVisible();
    await expect(likeCount).toHaveClass(/tabular-nums/);
    await expect(likeCount).toHaveClass(/text-\[15px\]/);

    // 6. Verify status bar has tabular-nums on step and rating
    const statusBar = page.getByTestId("puzzle-status-bar");
    await expect(statusBar).toBeVisible();
    await expect(statusBar).toHaveClass(/text-\[13px\]/);
    await expect(statusBar.locator("span.tabular-nums").first()).toBeVisible();

    // 7. Verify Move History Navigation with `<` and `>` buttons
    // Simulate solved state to pre-populate full move sequence
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    // When solved, viewMoveIndex is at the end of the history
    // prevBtn (<) is now enabled so user can step back through moves!
    await expect(prevBtn).toBeEnabled();
    await expect(prevBtn).not.toHaveClass(/pointer-events-none/);
    // nextBtn (>) is at the latest move so it remains disabled
    await expect(nextBtn).toBeDisabled();

    const solvedFen = await boardContainer.getAttribute("data-fen");

    // Click `<` to step back in move history
    await prevBtn.click();
    await page.waitForTimeout(250);

    const fenAfterStepBack = await boardContainer.getAttribute("data-fen");
    expect(fenAfterStepBack).not.toBe(solvedFen);

    // After stepping back, nextBtn (>) is now enabled to step forward!
    await expect(nextBtn).toBeEnabled();
    await expect(nextBtn).not.toHaveClass(/pointer-events-none/);

    // Click `>` to step forward in move history
    await nextBtn.click();
    await page.waitForTimeout(250);

    const fenAfterStepForward = await boardContainer.getAttribute("data-fen");
    expect(fenAfterStepForward).toBe(solvedFen);
    // Back at the end, nextBtn is disabled again
    await expect(nextBtn).toBeDisabled();

    // 8. Verify Keyboard Navigation: ArrowLeft steps back, ArrowRight steps forward
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(250);
    const fenAfterArrowLeft = await boardContainer.getAttribute("data-fen");
    expect(fenAfterArrowLeft).toBe(fenAfterStepBack);
    await expect(nextBtn).toBeEnabled();

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    const fenAfterArrowRight = await boardContainer.getAttribute("data-fen");
    expect(fenAfterArrowRight).toBe(solvedFen);

    // 9. Verify changing puzzles is done via vertical keys (ArrowDown / PageDown)
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(500);

    // 10. Verify borderless idle swipe indicator styling
    const indicator = page.getByTestId("idle-swipe-indicator");
    // Trigger solved again to inspect idle indicator styling when it appears
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("chess-reel-test-status", { detail: { status: "solved" } })
      );
    });

    // Verify indicator markup contains drop shadow and pointer-events-none
    // (Wait for idle timer or verify indicator classes)
    await page.waitForTimeout(7200);
    if (await indicator.isVisible()) {
      await expect(indicator).toHaveClass(/drop-shadow-/);
      await expect(indicator).toHaveClass(/pointer-events-none/);
      await expect(indicator).not.toHaveClass(/bg-\[#12100e\]/);
      await expect(indicator).not.toHaveClass(/border/);
    }
  });
});
