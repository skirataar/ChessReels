import { test, expect } from "@playwright/test";
import {
  resolveStreakOnLoad,
  resolveStreakOnSolve,
  getCalendarDaysDiff,
  StreakData,
} from "../lib/useStreak";

test.describe("Task 2: Deterministic Streak & 2-Day Streak Freeze System Unit Tests", () => {
  test("Calendar day diff calculation handles normal days and leap/month boundaries accurately", () => {
    expect(getCalendarDaysDiff("2026-11-01", "2026-11-01")).toBe(0);
    expect(getCalendarDaysDiff("2026-11-01", "2026-11-02")).toBe(1);
    expect(getCalendarDaysDiff("2026-11-01", "2026-11-03")).toBe(2);
    expect(getCalendarDaysDiff("2026-10-31", "2026-11-01")).toBe(1);
    expect(getCalendarDaysDiff("2026-02-28", "2026-03-01")).toBe(1);
  });

  test("Already solved today: does not increment currentStreak again", () => {
    const state: StreakData = {
      currentStreak: 5,
      lastSolvedDate: "2026-11-03",
      streakFreezes: 1,
      perfectWeekCounter: 3,
    };
    const nextState = resolveStreakOnSolve(state, "2026-11-03");
    expect(nextState.currentStreak).toBe(5);
    expect(nextState.streakFreezes).toBe(1);
    expect(nextState.perfectWeekCounter).toBe(3);
    expect(nextState.lastSolvedDate).toBe("2026-11-03");
  });

  test("Consecutive day solved (daysDiff === 1): increments streak and perfectWeekCounter", () => {
    const state: StreakData = {
      currentStreak: 3,
      lastSolvedDate: "2026-11-02",
      streakFreezes: 0,
      perfectWeekCounter: 2,
    };
    const nextState = resolveStreakOnSolve(state, "2026-11-03");
    expect(nextState.currentStreak).toBe(4);
    expect(nextState.perfectWeekCounter).toBe(3);
    expect(nextState.streakFreezes).toBe(0);
    expect(nextState.lastSolvedDate).toBe("2026-11-03");
  });

  test("Earn Streak Freeze Rule: 7 consecutive days awards 1 freeze clamped at 2", () => {
    const state: StreakData = {
      currentStreak: 6,
      lastSolvedDate: "2026-11-02",
      streakFreezes: 0,
      perfectWeekCounter: 6,
    };
    // 7th consecutive day
    const day7 = resolveStreakOnSolve(state, "2026-11-03");
    expect(day7.currentStreak).toBe(7);
    expect(day7.perfectWeekCounter).toBe(0); // resets counter
    expect(day7.streakFreezes).toBe(1); // earned 1 freeze

    // Second week completion
    const state2: StreakData = {
      currentStreak: 13,
      lastSolvedDate: "2026-11-09",
      streakFreezes: 1,
      perfectWeekCounter: 6,
    };
    const day14 = resolveStreakOnSolve(state2, "2026-11-10");
    expect(day14.currentStreak).toBe(14);
    expect(day14.perfectWeekCounter).toBe(0);
    expect(day14.streakFreezes).toBe(2); // capped at 2

    // Third week completion cannot exceed 2 freezes
    const state3: StreakData = {
      currentStreak: 20,
      lastSolvedDate: "2026-11-16",
      streakFreezes: 2,
      perfectWeekCounter: 6,
    };
    const day21 = resolveStreakOnSolve(state3, "2026-11-17");
    expect(day21.currentStreak).toBe(21);
    expect(day21.streakFreezes).toBe(2); // clamped strictly between 0 and 2
  });

  test("Missed 1 Calendar Day (daysDiff === 2) with streakFreezes >= 1: consumes 1 freeze and preserves streak", () => {
    const state: StreakData = {
      currentStreak: 10,
      lastSolvedDate: "2026-11-01",
      streakFreezes: 1,
      perfectWeekCounter: 5,
    };

    // On app load before solve: freeze protects streak (preserves streak at 10, enters icy frozen state)
    const onDailyLoad = resolveStreakOnLoad(state, "2026-11-03");
    expect(onDailyLoad.currentStreak).toBe(10);
    expect(onDailyLoad.streakFreezes).toBe(0);
    expect(onDailyLoad.isFrozenState).toBe(true);
    expect(onDailyLoad.perfectWeekCounter).toBe(0);

    // On solve: thaws freeze, preserves streak, increments to 11, starts new week progress at 1
    const onSolve = resolveStreakOnSolve(state, "2026-11-03");
    expect(onSolve.currentStreak).toBe(11);
    expect(onSolve.streakFreezes).toBe(0);
    expect(onSolve.perfectWeekCounter).toBe(1);
    expect(onSolve.isFrozenState).toBe(false);
    expect(onSolve.lastSolvedDate).toBe("2026-11-03");
  });

  test("Missed 1 Calendar Day (daysDiff === 2) with streakFreezes === 0: streak breaks", () => {
    const state: StreakData = {
      currentStreak: 10,
      lastSolvedDate: "2026-11-01",
      streakFreezes: 0,
      perfectWeekCounter: 4,
    };

    // On app load: streak lapsed to 0
    const onDailyLoad = resolveStreakOnLoad(state, "2026-11-03");
    expect(onDailyLoad.currentStreak).toBe(0);

    // On solve: resets to 1
    const onSolve = resolveStreakOnSolve(state, "2026-11-03");
    expect(onSolve.currentStreak).toBe(1);
    expect(onSolve.perfectWeekCounter).toBe(1);
    expect(onSolve.streakFreezes).toBe(0);
    expect(onSolve.lastSolvedDate).toBe("2026-11-03");
  });

  test("Missed 2 Calendar Days (daysDiff === 3) with streakFreezes === 2: consumes 2 freezes and preserves streak", () => {
    const state: StreakData = {
      currentStreak: 12,
      lastSolvedDate: "2026-11-01",
      streakFreezes: 2,
      perfectWeekCounter: 4,
    };

    // On app load before solve: 2 freezes protect the streak (preserves streak at 12, enters icy frozen state)
    const onDailyLoad = resolveStreakOnLoad(state, "2026-11-04");
    expect(onDailyLoad.currentStreak).toBe(12);
    expect(onDailyLoad.streakFreezes).toBe(0);
    expect(onDailyLoad.isFrozenState).toBe(true);
    expect(onDailyLoad.perfectWeekCounter).toBe(0);

    // On solve: thaws freeze, preserves streak, increments to 13, starts week progress at 1
    const onSolve = resolveStreakOnSolve(state, "2026-11-04");
    expect(onSolve.currentStreak).toBe(13);
    expect(onSolve.streakFreezes).toBe(0);
    expect(onSolve.perfectWeekCounter).toBe(1);
    expect(onSolve.isFrozenState).toBe(false);
    expect(onSolve.lastSolvedDate).toBe("2026-11-04");
  });

  test("Missed 2 Calendar Days (daysDiff === 3) with streakFreezes === 1: insufficient freezes, streak breaks", () => {
    const state: StreakData = {
      currentStreak: 12,
      lastSolvedDate: "2026-11-01",
      streakFreezes: 1,
      perfectWeekCounter: 4,
    };

    // On app load: streak lapsed
    const onDailyLoad = resolveStreakOnLoad(state, "2026-11-04");
    expect(onDailyLoad.currentStreak).toBe(0);

    // On solve: resets to 1
    const onSolve = resolveStreakOnSolve(state, "2026-11-04");
    expect(onSolve.currentStreak).toBe(1);
    expect(onSolve.perfectWeekCounter).toBe(1);
    expect(onSolve.streakFreezes).toBe(0);
  });

  test("Missed 3+ Calendar Days: streak is lost and resets to 1 on solve", () => {
    const state: StreakData = {
      currentStreak: 25,
      lastSolvedDate: "2026-10-20",
      streakFreezes: 2,
      perfectWeekCounter: 5,
    };

    const onSolve = resolveStreakOnSolve(state, "2026-11-03");
    expect(onSolve.currentStreak).toBe(1);
    expect(onSolve.perfectWeekCounter).toBe(1);
    expect(onSolve.streakFreezes).toBe(0);
  });

  test("Day 1 Streak Initialization: currentStreak === 0 immediately becomes 1 with today's date and perfectWeekCounter 1", () => {
    const state: StreakData = {
      currentStreak: 0,
      lastSolvedDate: null,
      streakFreezes: 0,
      perfectWeekCounter: 0,
    };
    const nextState = resolveStreakOnSolve(state, "2026-11-04");
    expect(nextState.currentStreak).toBe(1);
    expect(nextState.lastSolvedDate).toBe("2026-11-04");
    expect(nextState.perfectWeekCounter).toBe(1);

    // Even if lastSolvedDate was set from an old lapsed session
    const lapsedState: StreakData = {
      currentStreak: 0,
      lastSolvedDate: "2026-10-20",
      streakFreezes: 1,
      perfectWeekCounter: 0,
    };
    const nextLapsed = resolveStreakOnSolve(lapsedState, "2026-11-04");
    expect(nextLapsed.currentStreak).toBe(1);
    expect(nextLapsed.lastSolvedDate).toBe("2026-11-04");
    expect(nextLapsed.perfectWeekCounter).toBe(1);
    expect(nextLapsed.streakFreezes).toBe(1);
  });
});

test.describe("Task 1 & Task 2: UI Integration & In-App Saved Puzzle Player", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("Streak freeze indicator is visible in Header HUD and Profile with correct text and tooltip", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const account = {
        id: "streak_user_test",
        username: "streakpro",
        displayName: "Streak Master",
        avatar: "♚",
        elo: 1500,
        peakElo: 1500,
        streak: 8,
        bestStreak: 10,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      const streakData = {
        currentStreak: 8,
        lastSolvedDate: new Date().toISOString().split("T")[0],
        streakFreezes: 2,
        perfectWeekCounter: 1,
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(account));
      localStorage.setItem("chess_reel_streak_data", JSON.stringify(streakData));
      localStorage.setItem("chess_reel_daily_streak", "8");
      document.cookie = "chess_reel_session=streak_user_test; path=/; max-age=86400";
    });

    await page.goto("/play");

    // 1. Verify Header freeze indicator
    const headerFreeze = page.getByTestId("header-freeze-indicator");
    await expect(headerFreeze).toBeVisible({ timeout: 10000 });
    await expect(headerFreeze).toContainText("2/2");
    await expect(headerFreeze).toHaveAttribute(
      "title",
      "Earned every 7-day streak • Protects up to 2 missed days"
    );

    // 1b. Verify Header streak indicator is ignited (fill="#f59e0b", stroke="#fbbf24", text in #f5f2eb)
    const headerStreak = page.getByTestId("header-streak-indicator");
    await expect(headerStreak).toBeVisible();
    await expect(headerStreak).toContainText("8");
    const headerFlame = page.getByTestId("header-flame-icon");
    await expect(headerFlame).toHaveAttribute("fill", "#f59e0b");
    await expect(headerFlame).toHaveAttribute("stroke", "#fbbf24");
    await page.waitForTimeout(450);
    const streakNum = page.getByTestId("streak-number-display").last();
    await expect(streakNum).toHaveClass(/text-\[#f5f2eb\]/);

    // 2. Open Profile via Bottom Dock
    const dockProfileBtn = page.getByTestId("bottom-nav-profile");
    await expect(dockProfileBtn).toBeVisible({ timeout: 10000 });
    await dockProfileBtn.click();

    // 3. Verify Profile freeze indicator
    const profileFreeze = page.getByTestId("profile-freeze-indicator");
    await expect(profileFreeze).toBeVisible({ timeout: 5000 });
    await expect(profileFreeze).toContainText("2/2");
    await expect(profileFreeze).toHaveAttribute(
      "title",
      "Earned every 7-day streak • Protects up to 2 missed days"
    );
  });

  test("Saved Puzzles: empty list shows clean empty state without fake hardcoded puzzles", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const account = {
        id: "empty_saved_user",
        username: "emptytest",
        displayName: "Empty Tester",
        avatar: "♟",
        elo: 1200,
        peakElo: 1200,
        streak: 1,
        bestStreak: 1,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(account));
      localStorage.removeItem("chess_reel_bookmarks_empty_saved_user");
      localStorage.removeItem("chess_reel_bookmarks");
      document.cookie = "chess_reel_session=empty_saved_user; path=/; max-age=86400";
    });

    await page.goto("/play");

    const dockProfileBtn = page.getByTestId("bottom-nav-profile");
    await expect(dockProfileBtn).toBeVisible({ timeout: 10000 });
    await dockProfileBtn.click();

    // Switch to Saved Puzzles Tab
    const savedTab = page.getByRole("button", { name: /saved puzzles/i });
    await expect(savedTab).toBeVisible({ timeout: 5000 });
    await savedTab.click();

    // Verify clean empty state
    await expect(page.getByText("No Saved Puzzles Yet")).toBeVisible();
    await expect(
      page.getByText("Tap the bookmark icon 🔖 directly under any puzzle reel")
    ).toBeVisible();
    // Ensure 0 count pill
    await expect(savedTab).toContainText("0");
  });

  test("Saved Puzzles: clicking a saved card opens interactive player with '← Back to Saved' header bar", async ({
    page,
  }) => {
    const samplePuzzle = {
      id: "00008",
      fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/P1q2bPP/7K b - - 0 24",
      moves: "c2d1 e6e1 d1e1",
      rating: 1852,
      ratingDeviation: 74,
      popularity: 98,
      nbPlays: 3200,
      themes: "crushing deflection endgame short",
      gameUrl: "https://lichess.org/test",
    };

    await page.addInitScript((puzzle) => {
      const account = {
        id: "saved_play_user",
        username: "saveplayer",
        displayName: "Saved Player",
        avatar: "♚",
        elo: 1600,
        peakElo: 1600,
        streak: 4,
        bestStreak: 7,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(account));
      localStorage.setItem("chess_reel_bookmarks_saved_play_user", JSON.stringify(["00008"]));
      localStorage.setItem("chess_reel_bookmarks", JSON.stringify(["00008"]));
      localStorage.setItem(
        "chess_reel_saved_puzzles_saved_play_user",
        JSON.stringify({ "00008": puzzle })
      );
      localStorage.setItem("chess_reel_saved_puzzles", JSON.stringify({ "00008": puzzle }));
      document.cookie = "chess_reel_session=saved_play_user; path=/; max-age=86400";
    }, samplePuzzle);

    await page.goto("/play");

    const dockProfileBtn = page.getByTestId("bottom-nav-profile");
    await expect(dockProfileBtn).toBeVisible({ timeout: 10000 });
    await dockProfileBtn.click();

    // Switch to Saved Puzzles Tab
    const savedTab = page.getByRole("button", { name: /saved puzzles/i });
    await expect(savedTab).toBeVisible({ timeout: 5000 });
    await savedTab.click();

    // Verify saved puzzle card is displayed with hover & pointer styles
    const savedCard = page.getByTestId("saved-puzzle-00008");
    await expect(savedCard).toBeVisible();
    await expect(savedCard).toContainText("Puzzle #00008");
    await expect(savedCard).toContainText("1852 Elo");

    // Click the saved card to open interactive player
    await savedCard.click();

    // Verify in-app interactive player opens with top-left "← Back to Saved" header bar
    const backBtn = page.getByTestId("back-to-saved-btn");
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await expect(backBtn).toContainText("Back to Saved");

    // Verify chessboard is loaded in modal view
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("chessboard-container")).toBeVisible({ timeout: 5000 });

    // Click "← Back to Saved" header bar button
    await backBtn.click();

    // Verify user is returned directly to the Saved Puzzles list
    await expect(savedCard).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Saved Tactical Library")).toBeVisible();
  });

  test("0-day streak renders hollow flame (fill=none, stroke=#78716c) alongside 0 in stone muted text", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const account = {
        id: "streak_user_zero",
        username: "newbie_zero",
        displayName: "New Player",
        avatar: "♚",
        elo: 1200,
        peakElo: 1200,
        streak: 0,
        bestStreak: 0,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      const streakData = {
        currentStreak: 0,
        lastSolvedDate: null,
        streakFreezes: 0,
        perfectWeekCounter: 0,
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(account));
      localStorage.setItem("chess_reel_streak_data", JSON.stringify(streakData));
      localStorage.setItem("chess_reel_daily_streak", "0");
      document.cookie = "chess_reel_session=streak_user_zero; path=/; max-age=86400";
    });

    await page.goto("/play");

    const headerStreak = page.getByTestId("header-streak-indicator");
    await expect(headerStreak).toBeVisible({ timeout: 10000 });
    await expect(headerStreak).toContainText("0");

    const headerFlame = page.getByTestId("header-flame-icon");
    await expect(headerFlame).toHaveAttribute("fill", "none");
    await expect(headerFlame).toHaveAttribute("stroke", "#78716c");

    const streakNum = page.getByTestId("streak-number-display");
    await expect(streakNum).toHaveClass(/text-\[#78716c\]/);
  });
});
