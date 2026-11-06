import { test, expect, Page } from "@playwright/test";
import { resolveStreakOnSolve, StreakData } from "../lib/useStreak";

const TEST_EMAIL = "devtest@doomchess.local";
const TEST_PASSWORD = "TestPassword123!";
const TEST_USER_ID = "e1b4a7fd-d753-4cd1-8d17-937727cc3594";

async function loginWithDevtest(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();

  const signInBtn = page.getByRole("button", { name: "Sign In" });
  await expect(signInBtn).toBeVisible({ timeout: 5000 });
  await signInBtn.click();

  const userInput = page.locator("#login-username, input[placeholder*='email'], input[placeholder*='Username']").first();
  const passInput = page.locator("#login-password, input[type='password']").first();
  await userInput.fill(TEST_EMAIL);
  await passInput.fill(TEST_PASSWORD);

  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/play/, { timeout: 10000 });
  await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });
}

test.describe("PostgreSQL Database Persistence, Logout Isolation & Streak Freeze Regeneration", () => {
  test.beforeEach(async ({ request }) => {
    // Reset test user to a known baseline in PostgreSQL via API
    const patchRes = await request.patch("http://localhost:3000/api/user/account", {
      data: {
        userId: TEST_USER_ID,
        streak: 5,
        bestStreak: 10,
        streakFreezes: 1,
        perfectWeekCounter: 3,
        isFrozenState: false,
        lastSolvedDate: "2026-11-03",
        targetElo: 1650,
        autoAdvance: true,
        soundEnabled: true,
        showCoordinates: false,
        savedPuzzleIds: ["00008"],
      },
    });
    expect(patchRes.ok()).toBeTruthy();
  });

  test("1. Login restores streak, freeze count, settings, and bookmarks directly from PostgreSQL", async ({ page }) => {
    await loginWithDevtest(page);

    // Verify streak in top bar
    const trigger = page.getByTestId("header-streak-dropdown-trigger");
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await expect(trigger).toContainText("5");

    // Open streak calendar dropdown
    await trigger.click();
    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 4000 });

    // Verify freeze count is 1 / 2 (from DB)
    const freezeCount = page.getByTestId("dropdown-freeze-count");
    await expect(freezeCount).toBeVisible();
    await expect(freezeCount).toContainText("1 / 2");

    // Verify regen progress is 3/7 Days (from DB)
    await expect(dropdown).toContainText("3/7 Days");

    // Verify localStorage hydration
    const clientState = await page.evaluate(() => {
      return {
        autoAdvance: window.localStorage.getItem("chess_reel_auto_advance"),
        targetElo: window.localStorage.getItem("chess_reel_target_elo"),
        showCoordinates: window.localStorage.getItem("chess_reel_show_coordinates"),
        bookmarks: window.localStorage.getItem("chess_reel_bookmarks"),
      };
    });

    expect(clientState.autoAdvance).toBe("1");
    expect(clientState.targetElo).toBe("1650");
    expect(clientState.showCoordinates).toBe("0");
    expect(clientState.bookmarks).toContain("00008");
  });

  test("2. Logout clears local client cache cleanly without corrupting PostgreSQL database", async ({ page, request }) => {
    await loginWithDevtest(page);

    // Click profile button in bottom dock
    const profileBtn = page.getByTestId("bottom-nav-profile");
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();

    // Click sign out
    const signOutBtn = page.getByTitle("Sign out of account");
    await expect(signOutBtn).toBeVisible({ timeout: 5000 });
    await signOutBtn.click();

    await page.waitForURL("/", { timeout: 10000 });

    // Verify client cache is wiped of logged-in user account
    const wiped = await page.evaluate(() => {
      const rawStreak = window.localStorage.getItem("chess_reel_streak_data");
      const streakParsed = rawStreak ? JSON.parse(rawStreak) : null;
      return {
        account: window.localStorage.getItem("chess_reel_account"),
        currentStreak: streakParsed ? streakParsed.currentStreak : null,
        bookmarks: window.localStorage.getItem("chess_reel_bookmarks"),
      };
    });

    expect(wiped.account).toBeNull();
    // Streak data in client is reset to 0 (unauthenticated guest), not the user's streak 5
    expect(wiped.currentStreak === null || wiped.currentStreak === 0).toBeTruthy();

    // Verify database was NOT overwritten with 0s
    const dbRes = await request.get(`http://localhost:3000/api/user/account?userId=${TEST_USER_ID}`);
    expect(dbRes.ok()).toBeTruthy();
    const dbData = await dbRes.json();

    expect(dbData.user.streak).toBe(5);
    expect(dbData.user.streakFreezes).toBe(1);
    expect(dbData.user.perfectWeekCounter).toBe(3);
    expect(dbData.user.targetElo).toBe(1650);

    // Verify logging back in restores everything from PostgreSQL
    await loginWithDevtest(page);
    const trigger = page.getByTestId("header-streak-dropdown-trigger");
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await expect(trigger).toContainText("5");

    await trigger.click();
    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 4000 });
    await expect(page.getByTestId("dropdown-freeze-count")).toContainText("1 / 2");
    await expect(dropdown).toContainText("3/7 Days");
  });

  test("3. Streak Freeze Regeneration Logic: hide progress at 2/2 capacity and track when < 2", async ({ page, request }) => {
    // Set test user to full 2/2 freeze capacity in DB
    const patchRes = await request.patch("http://localhost:3000/api/user/account", {
      data: {
        userId: TEST_USER_ID,
        streak: 8,
        streakFreezes: 2,
        perfectWeekCounter: 0,
      },
    });
    expect(patchRes.ok()).toBeTruthy();

    await loginWithDevtest(page);

    const trigger = page.getByTestId("header-streak-dropdown-trigger");
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();

    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 4000 });

    // Verify freeze count is 2 / 2
    const freezeCount = page.getByTestId("dropdown-freeze-count");
    await expect(freezeCount).toContainText("2 / 2");

    // At full 2/2 capacity, the regen progress indicator MUST be hidden
    await expect(dropdown.locator("text=Earn next freeze")).not.toBeVisible();
    await expect(dropdown.locator("text=/7 Days")).not.toBeVisible();
  });

  test("4. Streak engine math: full 2/2 freezes stops tracking, < 2 earns freeze on 7th solve", () => {
    // A: Full 2/2 capacity: solving on day 2 does NOT increment perfectWeekCounter (stays 0)
    const initialFull: StreakData = {
      currentStreak: 5,
      lastSolvedDate: "2026-11-03",
      streakFreezes: 2,
      perfectWeekCounter: 0,
      isFrozenState: false,
    };

    const nextFull = resolveStreakOnSolve(initialFull, "2026-11-04");
    expect(nextFull.currentStreak).toBe(6);
    expect(nextFull.streakFreezes).toBe(2);
    expect(nextFull.perfectWeekCounter).toBe(0); // Strictly 0 at 2/2 capacity

    // B: 1/2 capacity with 6 days progress: solving on 7th consecutive day awards +1 freeze and resets counter
    const initialEarning: StreakData = {
      currentStreak: 10,
      lastSolvedDate: "2026-11-03",
      streakFreezes: 1,
      perfectWeekCounter: 6,
      isFrozenState: false,
    };

    const earned = resolveStreakOnSolve(initialEarning, "2026-11-04");
    expect(earned.currentStreak).toBe(11);
    expect(earned.streakFreezes).toBe(2); // Promoted from 1 to 2
    expect(earned.perfectWeekCounter).toBe(0); // Reset to 0

    // C: Once 2 freezes are reached, subsequent consecutive solve still stays at 0
    const afterCap = resolveStreakOnSolve(earned, "2026-11-05");
    expect(afterCap.currentStreak).toBe(12);
    expect(afterCap.streakFreezes).toBe(2);
    expect(afterCap.perfectWeekCounter).toBe(0);

    // D: 0 freezes: consecutive solve increments perfectWeekCounter from 0 to 1
    const zeroFreezes: StreakData = {
      currentStreak: 2,
      lastSolvedDate: "2026-11-03",
      streakFreezes: 0,
      perfectWeekCounter: 0,
      isFrozenState: false,
    };

    const nextZero = resolveStreakOnSolve(zeroFreezes, "2026-11-04");
    expect(nextZero.currentStreak).toBe(3);
    expect(nextZero.streakFreezes).toBe(0);
    expect(nextZero.perfectWeekCounter).toBe(1);
  });
});
