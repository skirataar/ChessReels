import { test, expect } from "@playwright/test";

const DEVTEST_USER = {
  id: "e1b4a7fd-d753-4cd1-8d17-937727cc3594",
  email: "devtest@doomchess.local",
  username: "devtest",
  displayName: "Dev Tester",
  avatar: "♟",
  elo: 1248,
  isCalibrated: true,
  calibrationStep: 6,
  plan: "free",
};

// Known test puzzle: White to move, White plays f3e5 (capture), Black plays c6e5, White plays d2d4
const TEST_PUZZLE = {
  id: "piece_interaction_test_101",
  fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
  moves: "f3e5 c6e5 d2d4",
  rating: 1250,
  ratingDeviation: 60,
  popularity: 95,
  nbPlays: 500,
  themes: "advantage middlegame short",
  gameUrl: "https://lichess.org/test",
  openingTags: "Italian Game",
};

test.describe("Chessboard Piece Interaction & Race Condition Hardening", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Intercept random puzzle API to guarantee known board position
    await page.route("**/api/puzzle/random*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_PUZZLE),
      });
    });

    // Authenticate using the single dedicated test account
    await page.goto("/play");
    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      localStorage.removeItem("chess_reel_puzzle_rating_history");
      localStorage.removeItem("chess_reel_rated_puzzle_ids");
      localStorage.removeItem("chess_reel_solved_ids");
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);
    await page.reload();

    const board = page.locator('[data-testid="chessboard-container"]');
    await expect(board).toBeVisible({ timeout: 10_000 });
  });

  test("1. Strictly block dragging opponent pieces while allowing friendly pieces", async ({
    page,
  }) => {
    // In this position, White is playerColor. Opponent is Black.
    // Friendly piece: White knight on f3
    const friendlyPiece = page.locator('[data-square="f3"] [data-piece]');
    await expect(friendlyPiece).toBeVisible();
    const friendlyCursor = await friendlyPiece.evaluate(
      (el) => window.getComputedStyle(el).cursor
    );
    expect(friendlyCursor).toBe("grab");
    const friendlyAria = await friendlyPiece.locator("..").getAttribute("aria-disabled");
    expect(friendlyAria).not.toBe("true");

    // Opponent pieces: Black knight on c6 and Black pawn on e5
    const opponentKnight = page.locator('[data-square="c6"] [data-piece]');
    await expect(opponentKnight).toBeVisible();
    const opponentCursor = await opponentKnight.evaluate(
      (el) => window.getComputedStyle(el).cursor
    );
    expect(opponentCursor).toBe("pointer");
    const opponentAria = await opponentKnight.locator("..").getAttribute("aria-disabled");
    expect(opponentAria).toBe("true");

    // Opponent pawn on e5
    const opponentPawn = page.locator('[data-square="e5"] [data-piece]');
    await expect(opponentPawn).toBeVisible();
    expect(await opponentPawn.locator("..").getAttribute("aria-disabled")).toBe("true");

    // Attempting to drag opponent piece c6 should not move it
    const c5Square = page.locator('[data-square="c5"]');
    await opponentKnight.dragTo(c5Square);

    // Piece should still remain on c6, not on c5
    await expect(page.locator('[data-square="c6"] [data-piece]')).toBeVisible();
    await expect(page.locator('[data-square="c5"] [data-piece]')).toHaveCount(0);
  });

  test("2. Clicking an opponent piece with nothing selected does not select it or show highlights", async ({
    page,
  }) => {
    // Click opponent knight on c6
    const c6Square = page.locator('[data-square="c6"]');
    await c6Square.click();

    // Verify c6 does not have the gold selection ring/box-shadow
    const c6Inner = page.locator('[data-square="c6"] > div');
    const styleAttr = (await c6Inner.getAttribute("style")) || "";
    expect(styleAttr).not.toContain("194, 155, 120"); // gold #c29b78 accent rgb
    expect(styleAttr).not.toContain("box-shadow");

    // Verify no destination highlights appeared on board (e.g. square a5 or e5)
    const a5Inner = page.locator('[data-square="a5"] > div');
    const a5Style = (await a5Inner.getAttribute("style")) || "";
    expect(a5Style).not.toContain("radial-gradient");
  });

  test("3. Instant friendly piece switching: clicking friendly piece A selects it, then friendly piece B switches immediately without error", async ({
    page,
  }) => {
    // Friendly piece A: Bishop on f1
    const f1Square = page.locator('[data-square="f1"]');
    await f1Square.click();

    // f1 should have the gold selection highlight
    const f1Inner = page.locator('[data-square="f1"] > div');
    await expect(f1Inner).toHaveAttribute("style", /194,\s*155,\s*120|c29b78/);

    // Legal destinations for bishop on f1 (e.g. c4) should show highlight
    const c4Inner = page.locator('[data-square="c4"] > div');
    await expect(c4Inner).toHaveAttribute("style", /radial-gradient/);

    // Click friendly piece B: Knight on f3
    const f3Square = page.locator('[data-square="f3"]');
    await f3Square.click();

    // f3 should now have the gold selection highlight
    const f3Inner = page.locator('[data-square="f3"] > div');
    await expect(f3Inner).toHaveAttribute("style", /194,\s*155,\s*120|c29b78/);

    // f1 should no longer have the selection highlight
    const f1StyleAfter = (await f1Inner.getAttribute("style")) || "";
    expect(f1StyleAfter).not.toContain("194, 155, 120");

    // Destination for knight on f3 (e.g. e5, which is capture) should have capture highlight
    const e5Inner = page.locator('[data-square="e5"] > div');
    await expect(e5Inner).toHaveAttribute("style", /radial-gradient/);

    // No mistake badge or error shake should have occurred
    await expect(page.locator('[data-testid="incorrect-flash-badge"]')).toHaveCount(0);
    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    const boardClasses = (await boardContainer.getAttribute("class")) || "";
    expect(boardClasses).not.toContain("animate-board-shake");
  });

  test("4. Clicking selected friendly piece A deselects it cleanly", async ({
    page,
  }) => {
    // Click friendly piece f3 to select
    const f3Square = page.locator('[data-square="f3"]');
    await f3Square.click();

    const f3Inner = page.locator('[data-square="f3"] > div');
    await expect(f3Inner).toHaveAttribute("style", /194,\s*155,\s*120|c29b78/);

    // Click friendly piece f3 again to deselect
    await f3Square.click();

    // Selection highlight is cleared
    await page.waitForTimeout(100);
    const f3StyleAfter = (await f3Inner.getAttribute("style")) || "";
    expect(f3StyleAfter).not.toContain("194, 155, 120");

    // Destination highlights cleared
    const e5Inner = page.locator('[data-square="e5"] > div');
    const e5StyleAfter = (await e5Inner.getAttribute("style")) || "";
    expect(e5StyleAfter).not.toContain("radial-gradient");
  });

  test("5. Legal capture: clicking friendly piece A then opponent piece C executes the capture move", async ({
    page,
  }) => {
    // Select friendly knight on f3
    const f3Square = page.locator('[data-square="f3"]');
    await f3Square.click();

    // Click opponent pawn on e5 (legal capture: f3xe5)
    const e5Square = page.locator('[data-square="e5"]');
    await e5Square.click();

    // Move is executed: White knight captures e5, opponent replies c6xe5 after delay
    // Progress should advance to Step 2 of 2
    await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 6000 });

    // Knight should now be on e5 (or after opponent reply, Black knight on e5)
    await expect(page.locator('[data-square="f3"] [data-piece]')).toHaveCount(0);
    await expect(page.locator('[data-square="e5"] [data-piece]')).toBeVisible();
  });

  test("6. Dropping a piece back onto its starting square keeps it selected without wrong-move error/shake", async ({
    page,
  }) => {
    const f3Piece = page.locator('[data-square="f3"] [data-piece]');
    const f3Square = page.locator('[data-square="f3"]');

    // Drag piece and drop back onto its own starting square
    await f3Piece.dragTo(f3Square);

    // Friendly knight f3 should remain selected
    const f3Inner = page.locator('[data-square="f3"] > div');
    await expect(f3Inner).toHaveAttribute("style", /194,\s*155,\s*120|c29b78/, {
      timeout: 3000,
    });

    // Legal destinations should still be highlighted
    const e5Inner = page.locator('[data-square="e5"] > div');
    await expect(e5Inner).toHaveAttribute("style", /radial-gradient/);

    // No error flash badge or shake
    await expect(page.locator('[data-testid="incorrect-flash-badge"]')).toHaveCount(0);
    const boardContainer = page.locator('[data-testid="chessboard-container"]');
    const boardClasses = (await boardContainer.getAttribute("class")) || "";
    expect(boardClasses).not.toContain("animate-board-shake");
  });
});
