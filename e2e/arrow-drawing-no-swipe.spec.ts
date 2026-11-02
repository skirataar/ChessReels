import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR =
  "/home/skirataar/.gemini/antigravity-ide/brain/53803d71-613c-470b-aba0-166c10c5831e";

test.describe("Arrow Line Drawing on Board & Swipe Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Seed authenticated account so puzzle reel is loaded directly
    await page.goto("http://localhost:3000/");
    await page.evaluate(() => {
      const mockUser = {
        id: "user-arrow-drawing-test",
        username: "ArrowMaster",
        displayName: "Arrow Master",
        elo: 1300,
        plan: "free",
        isCalibrated: true,
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(mockUser));
      document.cookie = "chess_reel_session=user-arrow-drawing-test; path=/; max-age=86400";
    });
    await page.goto("http://localhost:3000/play");
    // Wait for initial puzzle network fetch to complete
    await page.waitForResponse(
      (res) => res.url().includes("/api/puzzle/random"),
      { timeout: 5000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
  });

  test("1. Right-click dragging upward on the chessboard draws lines and does NOT swipe up", async ({
    page,
  }) => {
    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });

    const taglineElem = page.locator("[data-testid='puzzle-tagline-container']");
    await expect(taglineElem).toBeVisible();
    const initialTagline = await taglineElem.innerText();

    const box = await chessboard.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Start near lower-middle of the board and drag upward (like drawing e2 -> e4)
    const startX = box.x + box.width * 0.5;
    const startY = box.y + box.height * 0.75;
    const endX = box.x + box.width * 0.5;
    const endY = box.y + box.height * 0.25;

    // Right-click drag upward across the chessboard
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(endX, endY, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(400);

    // Verify puzzle did NOT advance
    const currentTagline = await taglineElem.innerText();
    expect(currentTagline).toBe(initialTagline);

    // Verify an arrow element was drawn on the board (react-chessboard SVG marker or path)
    const arrowElement = chessboard.locator("marker[id*='arrowhead'], svg path[marker-end]").first();
    await expect(arrowElement).toBeAttached();

    // Take screenshot of drawn arrow on the board
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "arrow_drawn_no_swipe.png"),
      fullPage: false,
    });
  });

  test("2. Dragging inside the chessboard does NOT trigger reel swipe", async ({
    page,
  }) => {
    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });

    const taglineElem = page.locator("[data-testid='puzzle-tagline-container']");
    await expect(taglineElem).toBeVisible();
    const initialTagline = await taglineElem.innerText();

    const box = await chessboard.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Drag upward across empty squares on the board flank (a4 -> a6)
    const startX = box.x + box.width * 0.08;
    const startY = box.y + box.height * 0.56;
    const endY = box.y + box.height * 0.31;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Puzzle should NOT have changed (remains on same puzzle)
    const currentTagline = await taglineElem.innerText();
    expect(currentTagline).toBe(initialTagline);
  });

  test("3. Swiping outside the chessboard (header or action bar) still advances to the next reel", async ({
    page,
  }) => {
    const chessboard = page.locator("[data-testid='chessboard-container']");
    await expect(chessboard).toBeVisible({ timeout: 10000 });

    const taglineElem = page.locator("[data-testid='puzzle-tagline-container']");
    await expect(taglineElem).toBeVisible();
    const initialTagline = await taglineElem.innerText();

    // Drag upward on the mission header bar (outside chessboard)
    const headerBar = page.locator("[data-testid='puzzle-board-header-bar']");
    await expect(headerBar).toBeVisible();
    const box = await headerBar.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 120, { steps: 10 });
    await page.mouse.up();

    // Verify it advances to the next puzzle
    await expect(async () => {
      const nextTagline = await taglineElem.innerText();
      expect(nextTagline).not.toBe(initialTagline);
    }).toPass({ timeout: 6000 });
  });
});
