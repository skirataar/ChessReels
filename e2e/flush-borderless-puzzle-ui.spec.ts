import { test, expect } from "@playwright/test";

test.describe("Flush Borderless Ultra-Minimalist Puzzle UI", () => {
  test("1. Flush navigation buttons, scaled action icons, keyboard arrows, and no duplicate header profile", async ({
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

    // 4. Verify chessboard has rounded-lg overflow-hidden
    const boardContainer = page.locator("[data-testid='chessboard-container']");
    await expect(boardContainer).toBeVisible();
    await expect(boardContainer).toHaveClass(/rounded-lg/);
    await expect(boardContainer).toHaveClass(/overflow-hidden/);

    // 5. Verify action row below board has flush `<` and `>` navigation buttons
    const prevBtn = page.getByTestId("prev-puzzle-btn");
    const nextBtn = page.getByTestId("next-puzzle-btn");
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // At currentIndex 0, prevBtn is disabled and dimmed
    await expect(prevBtn).toBeDisabled();
    await expect(prevBtn).toHaveClass(/opacity-25/);
    await expect(prevBtn).toHaveClass(/pointer-events-none/);

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

    // 7. Verify Keyboard Navigation: ArrowRight advances to next puzzle
    const firstFen = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='chessboard-container']");
      return el?.getAttribute("data-fen") || "";
    });

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);

    // After advancing, prevBtn is now enabled
    await expect(prevBtn).toBeEnabled();
    await expect(prevBtn).not.toHaveClass(/pointer-events-none/);

    // Keyboard Navigation: ArrowLeft returns to previous puzzle
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(600);

    // Back at first puzzle, prevBtn is disabled again
    await expect(prevBtn).toBeDisabled();
  });
});

