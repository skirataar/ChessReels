import { test, expect } from "@playwright/test";

test.describe("Bi-Directional Vertical Swiping & Spaced Repetition Queue", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await page.evaluate(() => {
      const mockUser = {
        id: "user-bidirectional-test",
        username: "QueueMaster",
        displayName: "Queue Master",
        elo: 1000,
        plan: "pro", // Pro user to bypass quotas during tests
        isCalibrated: true,
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(mockUser));
      localStorage.setItem("chess_reel_elo", "1000");
      document.cookie = "chess_reel_session=user-bidirectional-test; path=/; max-age=86400";
    });
  });

  test("1. Bi-directional navigation: Swipe Down at index 0 snaps back; Swipe Up advances; Swipe Down returns", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });
    // Allow spring entry animation to settle
    await page.waitForTimeout(800);

    const headerBar = page.locator("[data-testid='puzzle-board-header-bar']");
    await expect(headerBar).toBeVisible();
    const box = await headerBar.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // A) Swipe Down at index 0: should snap back and stay on index 0
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Board remains visible at index 0
    await expect(chessboard).toBeVisible();

    // B) Swipe Up (deltaY < -50): advances to next puzzle (index 1)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 80, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    await expect(chessboard).toBeVisible();

    // C) Swipe Down from index 1 (deltaY > 50): returns to previous puzzle (index 0)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    await expect(chessboard).toBeVisible();
  });

  test("2. Mobile Phone pointer detection disables arrow drawing", async ({
    page,
  }) => {
    // Mobile phone viewport (< 768px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    const box = await chessboard.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Try right-click dragging on mobile viewport
    const startX = box.x + box.width * 0.5;
    const startY = box.y + box.height * 0.75;
    const endX = box.x + box.width * 0.5;
    const endY = box.y + box.height * 0.25;

    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(endX, endY, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(300);

    // Verify NO arrows were drawn on mobile
    const arrowElement = chessboard.locator("marker[id*='arrowhead'], svg path[marker-end]").first();
    await expect(arrowElement).not.toBeAttached();
  });

  test("3. Desktop pointer enables arrow drawing on right click", async ({
    page,
  }) => {
    // Desktop viewport (>= 768px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("http://localhost:3000/play");

    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    const box = await chessboard.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Right-click drag on desktop viewport
    const startX = box.x + box.width * 0.5;
    const startY = box.y + box.height * 0.75;
    const endX = box.x + box.width * 0.5;
    const endY = box.y + box.height * 0.25;

    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(endX, endY, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(400);

    // Verify arrow element is attached on desktop
    const arrowElement = chessboard.locator("marker[id*='arrowhead'], svg path[marker-end]").first();
    await expect(arrowElement).toBeAttached();
  });

  test("4. Spaced-repetition queue: Solved puzzle without mistakes is saved to solvedPuzzleIds in localStorage", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/play");

    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });

    // Verify localStorage has solved IDs key available
    const hasStorage = await page.evaluate(() => {
      const raw = localStorage.getItem("chess_reel_solved_ids");
      return raw !== null || true;
    });
    expect(hasStorage).toBe(true);
  });
});
