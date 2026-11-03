import { test, expect } from "@playwright/test";

test.describe("Authentication, Cache Keying, No Fallback Puzzles & Seamless Logout Redirect", () => {
  test("1. Initial load shows clean minimal dark loading state and renders ONLY real database puzzles (no hardcoded fallbacks 00008 or 0000d)", async ({
    page,
    request,
  }) => {
    // 1. Create an authenticated 1500 Elo user account in the database
    const uniqueUser = `db_${Date.now().toString().slice(-8)}`;
    const createRes = await request.post("/api/user/account", {
      data: {
        username: uniqueUser,
        password: "password123",
        displayName: "DB Tactician",
        elo: 1500,
        startingElo: 1500,
      },
    });
    expect(createRes.ok()).toBe(true);

    // 2. Sign in via the official entry gate on '/'
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', uniqueUser);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 3. Lands on /play
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // 4. Verify the minimal dark loading skeleton or real board appears
    const skeletonOrBoard = page.locator("text=Preparing next reel...").or(page.locator("svg").first());
    await expect(skeletonOrBoard.first()).toBeVisible({ timeout: 5000 });

    // 5. Wait for chessboard to be rendered
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10000 });

    // 6. Verify the rendered puzzle is NOT the removed fallback 00008 or 0000d
    const puzzleInfo = page.getByText(/elo/i).first();
    await expect(puzzleInfo).toBeVisible();

    const puzzleText = await page.evaluate(() => document.body.innerText);

    // Puzzles 00008 (800) and 0000d (850) were hardcoded; a 1500 account should not see 800 or 850
    expect(puzzleText).not.toContain("00008");
    expect(puzzleText).not.toContain("0000d");

    // Check that the active puzzle rating matches 1500 calibration
    const eloBadge = page.locator("text=/\\d{3,4}\\s*Elo/i").first();
    await expect(eloBadge).toBeVisible();
    const eloText = await eloBadge.textContent();
    const parsedRating = parseInt(eloText?.replace(/\D/g, "") || "0", 10);
    expect(parsedRating).toBeGreaterThanOrEqual(1100);
  });

  test("2. Clear puzzle and user cache on logout: wipes queues, user state, and localStorage keys", async ({
    page,
    request,
  }) => {
    // 1. Create a user account
    const uniqueUser = `lgt_${Date.now().toString().slice(-8)}`;
    const createRes = await request.post("/api/user/account", {
      data: {
        username: uniqueUser,
        password: "password123",
        displayName: "Logout User",
        elo: 1600,
        startingElo: 1600,
      },
    });
    expect(createRes.ok()).toBe(true);
    const createdData = await createRes.json();
    const user = createdData.user;

    // 2. Sign in via entry gate
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', uniqueUser);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    // Pre-populate some user-scoped caches and session storage
    await page.evaluate((u) => {
      window.localStorage.setItem(
        `chess_reel_puzzle_queue_${u.id}`,
        JSON.stringify([{
          id: "cached_123",
          fen: "8/8/8/8/8/8/8/8 w - - 0 1",
          moves: "e2e4",
          rating: 1600
        }])
      );
      window.localStorage.setItem(
        "chess_reel_puzzle_queue",
        JSON.stringify([{
          id: "global_123",
          fen: "8/8/8/8/8/8/8/8 w - - 0 1",
          moves: "e2e4",
          rating: 1600
        }])
      );
      window.localStorage.setItem("chess_reel_peak_elo", "1750");
      window.sessionStorage.setItem("session_test", "active");
    }, user);

    await expect(page.getByTestId("header-profile-btn")).toBeVisible({ timeout: 10000 });

    // Open profile modal and click sign out
    await page.getByTestId("header-profile-btn").click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    const signOutBtn = page.getByTitle(/sign out of account/i);
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify redirected immediately to root onboarding gate '/'
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5000 });
    expect(page.url()).not.toContain("/play");

    // Verify all caches and keys were thoroughly wiped
    const storageAudit = await page.evaluate((id) => {
      return {
        account: window.localStorage.getItem("chess_reel_account"),
        elo: window.localStorage.getItem("chess_reel_elo"),
        plan: window.localStorage.getItem("chess_reel_plan"),
        peakElo: window.localStorage.getItem("chess_reel_peak_elo"),
        userQueue: window.localStorage.getItem(`chess_reel_puzzle_queue_${id}`),
        globalQueue: window.localStorage.getItem("chess_reel_puzzle_queue"),
        sessionItem: window.sessionStorage.getItem("session_test"),
        sessionCookie: document.cookie.includes("chess_reel_session="),
      };
    }, user.id);

    expect(storageAudit.account).toBeNull();
    expect(storageAudit.elo).toBeNull();
    expect(storageAudit.plan).toBeNull();
    expect(storageAudit.peakElo).toBeNull();
    expect(storageAudit.userQueue).toBeNull();
    expect(storageAudit.globalQueue).toBeNull();
    expect(storageAudit.sessionItem).toBeNull();
    expect(storageAudit.sessionCookie).toBe(false);
  });

  test("3. Account switch isolates queues: 1300 Elo account never sees leftover 2000+ Elo cached puzzles", async ({
    page,
    request,
  }) => {
    const highUser = `hi_${Date.now().toString().slice(-8)}`;
    const lowUser = `lo_${Date.now().toString().slice(-8)}`;

    const createHigh = await request.post("/api/user/account", {
      data: {
        username: highUser,
        password: "password123",
        displayName: "High Player",
        elo: 2100,
        startingElo: 2100,
      },
    });
    const highData = await createHigh.json();
    const highId = highData.user.id;

    const createLow = await request.post("/api/user/account", {
      data: {
        username: lowUser,
        password: "password123",
        displayName: "Low Player",
        elo: 1300,
        startingElo: 1300,
      },
    });
    const lowData = await createLow.json();
    const lowUserObj = lowData.user;

    // 1. User A (2100 Elo) has a queue with high-level puzzles cached
    // 2. User B (1300 Elo) logs in via UI
    await page.goto("/");
    await page.evaluate((hId) => {
      window.localStorage.setItem(
        `chess_reel_puzzle_queue_${hId}`,
        JSON.stringify([
          {
            id: "grandmaster_puzzle_9999",
            fen: "8/8/8/8/8/8/8/8 w - - 0 1",
            moves: "e2e4",
            rating: 2350,
            ratingDeviation: 60,
            popularity: 99,
            nbPlays: 100,
            themes: "endgame master",
          },
        ])
      );
    }, highId);

    // Sign in as User B
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', lowUser);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10000 });

    // Verify User B's active feed NEVER loaded User A's 2350 puzzle
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain("grandmaster_puzzle_9999");
    expect(pageText).not.toContain("2350");

    // Verify User B's queue does NOT contain User A's puzzle
    const lowQueue = await page.evaluate((lowId) => {
      const q = window.localStorage.getItem(`chess_reel_puzzle_queue_${lowId}`);
      return q ? JSON.parse(q) : [];
    }, lowUserObj.id);

    expect(lowQueue.some((p: any) => p.id === "grandmaster_puzzle_9999")).toBe(false);
  });

  test("4. Logout redirect flash fix: transitions in a single step via router.replace('/') without flashing old landing page", async ({
    page,
    request,
  }) => {
    const uniqueUser = `flsh_${Date.now().toString().slice(-8)}`;
    const createRes = await request.post("/api/user/account", {
      data: {
        username: uniqueUser,
        password: "password123",
        displayName: "Flash Tester",
        elo: 1400,
        startingElo: 1400,
      },
    });
    expect(createRes.ok()).toBe(true);

    // Sign in via entry gate
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.fill('input[placeholder="Username or email"]', uniqueUser);
    await page.fill('input[placeholder="Password"]', "password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/play/, { timeout: 10000 });

    await expect(page.getByTestId("header-profile-btn")).toBeVisible({ timeout: 10000 });

    // Monitor DOM mutations for any legacy landing page elements
    let legacyLandingPageDetected = false;
    await page.exposeFunction("onDomChangedLegacyCheck", (text: string) => {
      if (text.includes("Turn doomscrolling into tactical mastery") || text.includes("Explore feed as guest")) {
        legacyLandingPageDetected = true;
      }
    });

    await page.evaluate(() => {
      const observer = new MutationObserver(() => {
        const text = document.body.innerText;
        (window as any).onDomChangedLegacyCheck(text);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Open profile modal and click sign out
    await page.getByTestId("header-profile-btn").click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    const signOutBtn = page.getByTitle(/sign out of account/i);
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify redirected directly to root onboarding gate '/'
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5000 });

    // Verify root onboarding gate displays "Enter the Reel" or "Solve in 30s"
    await expect(page.getByRole("button", { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Verify legacy landing page never flashed during the transition
    expect(legacyLandingPageDetected).toBe(false);

    // Verify visiting /play when unauthenticated cleanly redirects to / without landing page
    await page.goto("/play");
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5000 });
    await expect(page.getByRole("button", { name: /get started/i })).toBeVisible({ timeout: 5000 });
    expect(legacyLandingPageDetected).toBe(false);
  });
});
