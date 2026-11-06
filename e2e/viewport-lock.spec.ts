import { test, expect, Page } from "@playwright/test";

const TEST_EMAIL = "devtest@doomchess.local";
const TEST_PASSWORD = "TestPassword123!";

async function loginAsDedicatedTestUser(page: Page) {
  await page.goto("/play");
  await page.waitForLoadState("domcontentloaded");

  const board = page.getByTestId("chessboard-container");
  const isAlreadyOnBoard = await board.isVisible({ timeout: 2500 }).catch(() => false);
  if (isAlreadyOnBoard) {
    return;
  }

  await page.goto("/");
  const signInBtn = page.getByRole("button", { name: "Sign In" });
  if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signInBtn.click();
    const userInput = page.locator("#login-username, input[placeholder*='email'], input[placeholder*='Username']").first();
    const passInput = page.locator("#login-password, input[type='password']").first();
    await userInput.fill(TEST_EMAIL);
    await passInput.fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });
  } else {
    const playNow = page.getByRole("button", { name: /Play Now|Play/i });
    if (await playNow.isVisible()) {
      await playNow.click();
      await page.waitForURL(/\/play/, { timeout: 10000 });
    }
  }

  await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });
}

test.describe("Route-Scoped Viewport Lock & Puzzle Gesture Isolation", () => {
  test("1. Route-Scoped Viewport Lock strictly locks native vertical page scrolling on /play", async ({ page }) => {
    await loginAsDedicatedTestUser(page);
    await page.goto("http://localhost:3000/play");
    await page.waitForSelector('[data-testid="chessboard-container"]');

    const styles = await page.evaluate(() => {
      const root = document.querySelector("div.h-dvh");
      const puzzleWrapper = document.querySelector(".touch-none");
      return {
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
        bodyOverscroll: document.body.style.overscrollBehaviorY,
        hasRootContainer: !!root,
        rootClass: root?.className || "",
        hasTouchNone: !!puzzleWrapper,
      };
    });

    expect(styles.htmlOverflow).toBe("hidden");
    expect(styles.bodyOverflow).toBe("hidden");
    expect(styles.bodyOverscroll).toBe("none");
    expect(styles.hasRootContainer).toBe(true);
    expect(styles.rootClass).toContain("h-dvh");
    expect(styles.rootClass).toContain("max-h-dvh");
    expect(styles.rootClass).toContain("overflow-hidden");
    expect(styles.rootClass).toContain("overscroll-none");
    expect(styles.hasTouchNone).toBe(true);
  });

  test("2. Navigating away from /play cleanly restores normal vertical page scrolling", async ({ page }) => {
    await loginAsDedicatedTestUser(page);
    await page.goto("http://localhost:3000/play");
    await page.waitForSelector('[data-testid="chessboard-container"]');

    // Navigate to /stats (Profile)
    await page.goto("http://localhost:3000/stats");
    await page.waitForTimeout(500);

    const statsStyles = await page.evaluate(() => ({
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehaviorY,
    }));

    // Inline overflow locks must be cleanly cleared
    expect(statsStyles.htmlOverflow).toBe("");
    expect(statsStyles.bodyOverflow).toBe("");
    expect(statsStyles.bodyOverscroll).toBe("");

    // Navigate to /practice
    await page.goto("http://localhost:3000/practice");
    await page.waitForTimeout(500);

    const practiceStyles = await page.evaluate(() => ({
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehaviorY,
    }));

    expect(practiceStyles.htmlOverflow).toBe("");
    expect(practiceStyles.bodyOverflow).toBe("");
    expect(practiceStyles.bodyOverscroll).toBe("");
  });

  test("3. /temp-qa renders cleanly without Next.js hydration mismatch errors", async ({ page }) => {
    const errorLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errorLogs.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000/temp-qa");
    await page.waitForSelector('[data-testid="module-onboarding-upsell"]');

    // No React hydration failure overlay or errors
    const hydrationOverlay = page.locator('text="Hydration failed"');
    await expect(hydrationOverlay).not.toBeVisible();

    const recoverableError = page.locator('text="Recoverable Error"');
    await expect(recoverableError).not.toBeVisible();

    const hasHydrationError = errorLogs.some(
      (log) => log.includes("Hydration failed") || log.includes("server rendered HTML didn't match")
    );
    expect(hasHydrationError).toBe(false);
  });

  test("4. Dynamic Cross-Device Viewport Scaling: chessboard scales via min(calc(100vw - 24px), calc(100dvh - 230px), 520px) without vertical scroll", async ({
    page,
  }) => {
    await loginAsDedicatedTestUser(page);

    // Test Resolution 1: Small mobile (iPhone SE 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000/play");
    await page.waitForSelector('[data-testid="chessboard-container"]');

    const iphoneSeMetrics = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="chessboard-container"]');
      const rect = board?.getBoundingClientRect() || { width: 0, height: 0, bottom: 0 };
      const doc = document.documentElement;
      return {
        boardWidth: Math.round(rect.width),
        boardHeight: Math.round(rect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
      };
    });

    // Board must be 1:1 aspect-square
    expect(Math.abs(iphoneSeMetrics.boardWidth - iphoneSeMetrics.boardHeight)).toBeLessThanOrEqual(2);
    // Board width must not exceed width or height clamps: min(375 - 24, 667 - 230, 520) = min(351, 437, 520) = 351px
    expect(iphoneSeMetrics.boardWidth).toBeLessThanOrEqual(352);
    // Zero vertical page overflow
    expect(iphoneSeMetrics.scrollHeight).toBeLessThanOrEqual(iphoneSeMetrics.clientHeight + 1);

    // Test Resolution 2: Short Laptop / Desktop (1366x768)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(200);

    const laptopMetrics = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="chessboard-container"]');
      const rect = board?.getBoundingClientRect() || { width: 0, height: 0, bottom: 0 };
      const doc = document.documentElement;
      return {
        boardWidth: Math.round(rect.width),
        boardHeight: Math.round(rect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
      };
    });

    expect(Math.abs(laptopMetrics.boardWidth - laptopMetrics.boardHeight)).toBeLessThanOrEqual(2);
    // On laptop 1366x768: min(1366 - 24 = 1342, 768 - 230 = 538, 520) = 520px max clamp
    expect(laptopMetrics.boardWidth).toBeLessThanOrEqual(522);
    expect(laptopMetrics.boardWidth).toBeGreaterThanOrEqual(490);
    expect(laptopMetrics.scrollHeight).toBeLessThanOrEqual(laptopMetrics.clientHeight + 1);

    // Test Resolution 3: Standard Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    const standardMobileMetrics = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="chessboard-container"]');
      const rect = board?.getBoundingClientRect() || { width: 0, height: 0, bottom: 0 };
      const doc = document.documentElement;
      return {
        boardWidth: Math.round(rect.width),
        boardHeight: Math.round(rect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
      };
    });

    expect(Math.abs(standardMobileMetrics.boardWidth - standardMobileMetrics.boardHeight)).toBeLessThanOrEqual(2);
    // min(390 - 24 = 366, 844 - 230 = 614, 520) = 366px
    expect(Math.abs(standardMobileMetrics.boardWidth - 366)).toBeLessThanOrEqual(3);
    expect(standardMobileMetrics.scrollHeight).toBeLessThanOrEqual(standardMobileMetrics.clientHeight + 1);
  });

  test("5. King-in-check crimson highlight dynamically highlights King's square and updates on move navigation", async ({
    page,
  }) => {
    // Puzzle with check move:
    // Initial: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/P1q2bPP/7K b - - 0 24" (Black to move, not in check)
    // Move 1: c2d1+ (White King on h1 is put in CHECK!)
    // Move 2: e6e1 (White blocks check)
    // Move 3: d1e1# (Black checkmates White King on h1!)
    const sampleCheckPuzzle = {
      id: "check_highlight_001",
      fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/P1q2bPP/7K b - - 0 24",
      moves: "c2d1 e6e1 d1e1",
      rating: 1650,
      ratingDeviation: 70,
      popularity: 98,
      nbPlays: 2500,
      themes: "crushing deflection endgame",
      gameUrl: "https://lichess.org/test",
    };

    await loginAsDedicatedTestUser(page);

    // Save puzzle to user's saved library
    await page.evaluate((p) => {
      const accRaw = localStorage.getItem("chess_reel_account");
      const userId = accRaw ? JSON.parse(accRaw).id : "devtest_user";
      localStorage.setItem(`chess_reel_bookmarks_${userId}`, JSON.stringify([p.id]));
      localStorage.setItem("chess_reel_bookmarks", JSON.stringify([p.id]));
      localStorage.setItem(`chess_reel_saved_puzzles_${userId}`, JSON.stringify({ [p.id]: p }));
      localStorage.setItem("chess_reel_saved_puzzles", JSON.stringify({ [p.id]: p }));
    }, sampleCheckPuzzle);

    // Open profile modal via bottom dock
    const profileBtn = page.getByTestId("bottom-nav-profile");
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();

    // Switch to Saved Puzzles Tab
    const savedTab = page.getByRole("button", { name: /saved puzzles/i });
    await expect(savedTab).toBeVisible({ timeout: 5000 });
    await savedTab.click();

    // Open interactive saved puzzle player
    const puzzleCard = page.getByTestId(`saved-puzzle-${sampleCheckPuzzle.id}`);
    await expect(puzzleCard).toBeVisible({ timeout: 5000 });
    await puzzleCard.click();

    // Wait for the chessboard inside modal to load
    const dialog = page.getByRole("dialog");
    const boardContainer = dialog.getByTestId("chessboard-container");
    await expect(boardContainer).toBeVisible({ timeout: 8000 });

    // 1. Initial position in saved player loads at Move 0 (Black to move, not in check)
    await expect(boardContainer).not.toHaveAttribute("data-in-check-square");
    const prevBtn = dialog.getByTestId("prev-puzzle-btn");
    await expect(prevBtn).toBeDisabled();

    // 2. Play Move 1 (c2d1+ puts White King on h1 in check) by clicking c2 then d1
    const squareC2 = dialog.locator('[data-square="c2"]');
    const squareD1 = dialog.locator('[data-square="d1"]');
    await expect(squareC2).toBeVisible();
    await expect(squareD1).toBeVisible();
    await squareC2.click();
    await squareD1.click();

    // Check highlight must be present on h1
    await expect(boardContainer).toHaveAttribute("data-in-check-square", "h1");

    // Verify h1 square has crimson glow styles applied
    const h1Styles = await page.evaluate(() => {
      const h1Square = document.querySelector('[role="dialog"] [data-square="h1"]');
      return {
        hasH1: !!h1Square,
        outerHtml: h1Square?.outerHTML || "",
      };
    });
    expect(h1Styles.hasH1).toBe(true);
    expect(h1Styles.outerHtml).toContain("rgba(239, 68, 68");

    // 3. Step backward (<) to initial position: check highlight disappears
    await expect(prevBtn).toBeEnabled();
    await prevBtn.click({ force: true });
    await expect(boardContainer).not.toHaveAttribute("data-in-check-square");

    // 4. Step forward (>) to Move 1 again: check returns to h1
    const nextBtn = dialog.getByTestId("next-puzzle-btn");
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click({ force: true });
    await expect(boardContainer).toHaveAttribute("data-in-check-square", "h1");
  });

  test("6. Decluttered header: top-right profile button is completely removed and header ends at trophy", async ({
    page,
  }) => {
    await loginAsDedicatedTestUser(page);
    await page.goto("http://localhost:3000/play");
    await page.waitForSelector('[data-testid="chessboard-container"]');

    // Header profile button must not exist
    await expect(page.getByTestId("header-profile-btn")).not.toBeVisible();
    expect(await page.locator('[data-testid="header-profile-btn"]').count()).toBe(0);

    // Header rank/trophy icon is visible on the far right of header
    await expect(page.getByTestId("header-rank-btn")).toBeVisible();

    // Profile navigation lives strictly in bottom navigation dock
    const bottomNavProfile = page.getByTestId("bottom-nav-profile");
    await expect(bottomNavProfile).toBeVisible();
    await bottomNavProfile.click();

    // Dialog opens cleanly
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });
});

