import { test, expect } from "@playwright/test";

test.describe("Chess Reel - Phase 3 E2E Integration", () => {
  test("loads puzzle, displays Elo, and responds to board interactions", async ({
    page,
  }) => {
    // 1. Navigate to the reels feed as guest
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
    });
    await page.goto("/");

    // 2. Verify page title and header elements
    await expect(page).toHaveTitle(/Chess Reel/i);
    await expect(page.getByText("Your Rating", { exact: false })).toBeVisible();

    // 3. Verify PWA manifest link in document head
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");

    // 4. Wait for the chessboard container to load
    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    await expect(boardContainer).toBeVisible({ timeout: 10_000 });

    // 5. Verify initial Elo rating is displayed
    const eloElement = page.locator("text=/\\d{3,4}/").first();
    await expect(eloElement).toBeVisible();

    // 6. Verify the "Next Puzzle" action button is visible and active
    const nextButton = page.getByRole("button", { name: /next puzzle/i });
    await expect(nextButton).toBeVisible();

    // 7. Verify persistent guest session was generated in localStorage
    const guestId = await page.evaluate(() =>
      window.localStorage.getItem("chess_reel_guest_id")
    );
    expect(guestId).toBeTruthy();

    // 8. Simulate interaction on the chessboard (drag and drop gesture)
    const box = await boardContainer.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const squareSize = box.width / 8;
      const startX = box.x + squareSize * 4.5;
      const startY = box.y + box.height - squareSize * 1.5;
      const targetX = startX;
      const targetY = startY - squareSize * 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 5 });
      await page.mouse.up();
    }

    // 9. Verify the UI remains responsive and intact after interaction
    await expect(boardContainer).toBeVisible();
    await expect(nextButton).toBeEnabled();

    // 10. Click Next Puzzle to verify navigation and buffer replenishment
    await nextButton.click();
    await expect(boardContainer).toBeVisible();
  });
});
