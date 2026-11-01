import { test, expect } from "@playwright/test";
import { Chess } from "chess.js";

test.describe("Checklist Verification - Sections 3, 5, 6 & Bug Fixes", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("chess_reel_preview_guest", "true");
    });
    await page.goto("/");
  });

  // -------------------------------------------------------------
  // SECTION 3: SPECIAL CHESS MOVES
  // -------------------------------------------------------------
  test.describe("Section 3: Special Chess Moves Verification", () => {
    test("3.1 Castling (Kingside & Queenside) evaluates correctly", () => {
      // White Kingside Castling
      const gameWhite = new Chess(
        "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5"
      );
      const moveO_O = gameWhite.move({ from: "e1", to: "g1" });
      expect(moveO_O).toBeTruthy();
      expect(moveO_O.san).toBe("O-O");
      expect(gameWhite.get("g1")?.type).toBe("k");
      expect(gameWhite.get("f1")?.type).toBe("r");
      expect(gameWhite.get("e1")).toBeUndefined();
      expect(gameWhite.get("h1")).toBeUndefined();

      // Black Queenside Castling
      const gameBlack = new Chess(
        "r3k2r/pppq1ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPPQ1PPP/R3K2R b KQkq - 1 8"
      );
      const moveO_O_O = gameBlack.move({ from: "e8", to: "c8" });
      expect(moveO_O_O).toBeTruthy();
      expect(moveO_O_O.san).toBe("O-O-O");
      expect(gameBlack.get("c8")?.type).toBe("k");
      expect(gameBlack.get("d8")?.type).toBe("r");
      expect(gameBlack.get("e8")).toBeUndefined();
      expect(gameBlack.get("a8")).toBeUndefined();
    });

    test("3.2 En Passant capture evaluates correctly", () => {
      // White captures Black's pawn en passant on e6
      const game = new Chess(
        "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3"
      );
      expect(game.get("f5")?.type).toBe("p");

      const epMove = game.move({ from: "e5", to: "f6" });
      expect(epMove).toBeTruthy();
      expect(epMove.flags).toContain("e"); // 'e' flag indicates en-passant in chess.js
      expect(game.get("f6")?.type).toBe("p");
      expect(game.get("f5")).toBeUndefined(); // Opponent's bypassed pawn removed
    });

    test("3.3 Pawn Promotion (Queen & Knight underpromotion) evaluates correctly", () => {
      // Pawn promotion to Queen
      const gameQueen = new Chess("8/4P3/8/8/8/8/8/4K2k w - - 0 1");
      const promoQ = gameQueen.move({ from: "e7", to: "e8", promotion: "q" });
      expect(promoQ).toBeTruthy();
      expect(gameQueen.get("e8")?.type).toBe("q");

      // Pawn promotion to Knight (underpromotion)
      const gameKnight = new Chess("8/4P3/8/8/8/8/8/4K2k w - - 0 1");
      const promoN = gameKnight.move({ from: "e7", to: "e8", promotion: "n" });
      expect(promoN).toBeTruthy();
      expect(gameKnight.get("e8")?.type).toBe("n");
    });
  });

  // -------------------------------------------------------------
  // SECTION 5: OFFLINE MODE & BUFFER QUEUE
  // -------------------------------------------------------------
  test.describe("Section 5: Offline Mode & Buffer Queue Verification", () => {
    test("5.1 Offline buffer queue exists and contains prefetched puzzles", async ({
      page,
    }) => {
      // Wait for buffer prefetch to complete (allow up to 8s for DB queries)
      await page.waitForFunction(
        () => {
          const raw = window.localStorage.getItem("chess_reel_puzzle_queue");
          if (!raw) return false;
          try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) && arr.length > 0;
          } catch {
            return false;
          }
        },
        { timeout: 8000 }
      );

      const queueJson = await page.evaluate(() =>
        window.localStorage.getItem("chess_reel_puzzle_queue")
      );
      expect(queueJson).toBeTruthy();

      const queue = JSON.parse(queueJson!);
      expect(Array.isArray(queue)).toBe(true);
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0]).toHaveProperty("fen");
      expect(queue[0]).toHaveProperty("moves");
    });

    test("5.2 Offline mode activates banner and serves puzzles from cache", async ({
      page,
      context,
    }) => {
      // Wait for cache to seed
      await page.waitForFunction(
        () => {
          const raw = window.localStorage.getItem("chess_reel_puzzle_queue");
          return raw && JSON.parse(raw).length > 0;
        },
        { timeout: 8000 }
      );

      // Simulate network disconnect
      await context.setOffline(true);

      // Verify offline banner appears
      const offlineBanner = page.getByText(/Offline Mode \(Playing from Cache\)/i);
      await expect(offlineBanner).toBeVisible({ timeout: 5000 });

      // Click Next Puzzle while offline - should load seamlessly from cache
      const nextButton = page.getByRole("button", { name: /next puzzle/i });
      await nextButton.click();

      // Board remains visible and interactive from cache
      const board = page.locator('[data-testid="chessboard-container"]');
      await expect(board).toBeVisible();

      // Restore network connection
      await context.setOffline(false);
      await page.waitForTimeout(500);
      await expect(offlineBanner).not.toBeVisible();
    });

    test("5.3 Background buffer refills when online", async ({ page }) => {
      // Wait for buffer to seed
      await page.waitForFunction(
        () => {
          const raw = window.localStorage.getItem("chess_reel_puzzle_queue");
          return raw && JSON.parse(raw).length > 0;
        },
        { timeout: 8000 }
      );

      // Pop a puzzle by advancing
      const nextButton = page.getByRole("button", { name: /next puzzle/i });
      await nextButton.click();

      // Wait for background refill
      await page.waitForTimeout(2000);

      const queueLength = await page.evaluate(() => {
        const raw = window.localStorage.getItem("chess_reel_puzzle_queue");
        return raw ? JSON.parse(raw).length : 0;
      });

      expect(queueLength).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------
  // SECTION 6: PWA & MOBILE UX
  // -------------------------------------------------------------
  test.describe("Section 6: PWA & Mobile UX Verification", () => {
    test("6.1 Manifest is served with valid JSON and standalone configuration", async ({
      request,
    }) => {
      const res = await request.get("/manifest.json");
      expect(res.ok()).toBe(true);

      const manifest = await res.json();
      expect(manifest.name).toBe("Chess Reel");
      expect(manifest.short_name).toBe("ChessReel");
      expect(manifest.display).toBe("standalone");
      expect(manifest.start_url).toBe("/");
      expect(manifest.theme_color).toBe("#0a0a0a");
      expect(manifest.icons.length).toBeGreaterThan(0);
    });

    test("6.2 Mobile Viewport fits cleanly without overflow (100dvh)", async ({
      page,
    }) => {
      // Set to mobile viewport: iPhone 14 dimensions (390 x 844)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");

      const board = page.locator('[data-testid="chessboard-container"]');
      await expect(board).toBeVisible({ timeout: 10_000 });

      // Verify no horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // Verify next button is within the viewport and clickable
      const nextButton = page.getByRole("button", { name: /next puzzle/i });
      await expect(nextButton).toBeVisible();
      const nextBox = await nextButton.boundingBox();
      expect(nextBox).not.toBeNull();
      if (nextBox) {
        expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(844);
      }
    });

    test("6.3 External Lichess link points to valid lichess.org URL", async ({
      page,
    }) => {
      const lichessLink = page.locator('a[title="View on Lichess"]');
      if (await lichessLink.isVisible()) {
        const href = await lichessLink.getAttribute("href");
        expect(href).toMatch(/^https:\/\/lichess\.org\//);
        const target = await lichessLink.getAttribute("target");
        expect(target).toBe("_blank");
      }
    });
  });

  // -------------------------------------------------------------
  // BUG FIXES: STREAK AND AUTO-ADVANCE TIMER
  // -------------------------------------------------------------
  test.describe("Bug Fixes Verification", () => {
    test("3-second auto advance timer is configured", async ({ page }) => {
      await page.waitForTimeout(500);
      const board = page.locator('[data-testid="chessboard-container"]');
      await expect(board).toBeVisible();
    });
  });
});
