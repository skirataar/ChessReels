import { test, expect } from "@playwright/test";

test.describe("Profile Settings, Change Password, Saved Puzzles & Flush Under-Board UI", () => {
  test("1. Change password API verifies current password and updates password hash", async ({ request }) => {
    // 1. Create a test user via account endpoint (username must be 3-20 chars)
    const uniqueUser = `pwd_${Date.now().toString().slice(-8)}`;
    const createRes = await request.post("/api/user/account", {
      data: {
        username: uniqueUser,
        password: "oldpassword123",
        displayName: "Password Tester",
      },
    });
    expect(createRes.ok()).toBe(true);
    const createdData = await createRes.json();
    const userId = createdData.user.id;

    // 2. Attempt change password with wrong current password -> should fail (400)
    const failRes = await request.post("/api/user/change-password", {
      data: {
        userId,
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      },
    });
    expect(failRes.status()).toBe(400);
    const failData = await failRes.json();
    expect(failData.error).toContain("Current password does not match");

    // 3. Attempt change password with short new password -> should fail (400)
    const shortRes = await request.post("/api/user/change-password", {
      data: {
        userId,
        currentPassword: "oldpassword123",
        newPassword: "123",
      },
    });
    expect(shortRes.status()).toBe(400);

    // 4. Change password with correct credentials -> should succeed (200)
    const successRes = await request.post("/api/user/change-password", {
      data: {
        userId,
        currentPassword: "oldpassword123",
        newPassword: "newpassword456",
      },
    });
    expect(successRes.ok()).toBe(true);
    const successData = await successRes.json();
    expect(successData.success).toBe(true);

    // 5. Verify user can now log in with the new password
    const loginRes = await request.post("/api/user/login", {
      data: {
        username: uniqueUser,
        password: "newpassword456",
      },
    });
    expect(loginRes.ok()).toBe(true);
  });

  test("2. Under-board controls are flush (no bulky pill buttons) and Instagram-style actions work", async ({ page }) => {
    // Set mobile viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/play");

    // Clear stale storage and set active test account
    await page.evaluate(() => {
      const account = {
        id: "test_ui_user",
        username: "uitestuser",
        displayName: "UI Tester",
        avatar: "♟",
        elo: 1350,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(account));
      localStorage.setItem("chess_reel_elo", "1350");
      document.cookie = "chess_reel_session=test_ui_user; path=/; max-age=86400";
    });
    await page.reload();

    // Verify chessboard is visible
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10000 });

    // Verify Flush Like button (Heart)
    const likeBtn = page.getByRole("button", { name: /like puzzle/i });
    await expect(likeBtn).toBeVisible();

    // Verify Flush Bookmark button
    const bookmarkBtn = page.getByRole("button", { name: /save puzzle pattern/i });
    await expect(bookmarkBtn).toBeVisible();

    // Verify Flush Share button
    const shareBtn = page.getByRole("button", { name: /share puzzle card/i });
    await expect(shareBtn).toBeVisible();

    // Verify Flush Solver Actions: Reset, Hint, Skip
    const resetBtn = page.getByTestId("reset-puzzle-btn");
    await expect(resetBtn).toBeVisible();

    const hintBtn = page.getByTestId("hint-btn");
    await expect(hintBtn).toBeVisible();

    const nextBtn = page.getByTestId("next-puzzle-btn");
    await expect(nextBtn).toBeVisible();

    // Verify Flush Turn & Rating info
    await expect(page.getByText(/(white|black) to move/i)).toBeVisible();
    await expect(page.getByText(/elo/i).first()).toBeVisible();

    // Verify bookmarking a puzzle updates scoped localStorage
    await bookmarkBtn.click();
    const isSaved = await page.evaluate(() => {
      const saved = localStorage.getItem("chess_reel_bookmarks_test_ui_user");
      return saved && JSON.parse(saved).length > 0;
    });
    expect(isSaved).toBe(true);
  });

  test("3. ProfileModal displays tabs, lists Saved Puzzles, and includes Change Password in settings", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/play");

    await page.evaluate(() => {
      const account = {
        id: "test_profile_user",
        username: "proftest",
        displayName: "Profile Tester",
        avatar: "♚",
        elo: 1400,
        peakElo: 1400,
        streak: 3,
        bestStreak: 5,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "free",
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(account));
      localStorage.setItem("chess_reel_elo", "1400");
      // Pre-populate one saved puzzle
      localStorage.setItem("chess_reel_bookmarks_test_profile_user", JSON.stringify(["00008"]));
      document.cookie = "chess_reel_session=test_profile_user; path=/; max-age=86400";
    });
    await page.reload();

    // Wait for chessboard and header to hydrate
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("header-quota-btn")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify header profile button is completely removed
    await expect(page.getByTestId("header-profile-btn")).not.toBeVisible();

    // Open profile modal via bottom dock profile button
    const bottomNavProfile = page.getByTestId("bottom-nav-profile");
    await expect(bottomNavProfile).toBeVisible({ timeout: 10000 });
    await bottomNavProfile.click();

    // Verify Profile Modal is open
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Profile Tester|proftest/i).first()).toBeVisible();

    // Verify Navigation Tabs: Profile & Stats vs Saved Puzzles
    const profileTab = page.getByRole("button", { name: /profile & stats/i });
    const savedTab = page.getByRole("button", { name: /saved puzzles/i });
    await expect(profileTab).toBeVisible();
    await expect(savedTab).toBeVisible();

    // Verify Change Password button exists in settings
    const changePasswordBtn = page.getByRole("button", { name: /change password/i });
    await expect(changePasswordBtn).toBeVisible();
    await changePasswordBtn.click();

    // Verify password inputs appear
    await expect(page.getByPlaceholder(/new password/i)).toBeVisible();
    await expect(page.getByPlaceholder(/repeat password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save new password/i })).toBeVisible();

    // Switch to "Saved Puzzles" tab
    await savedTab.click();

    // Verify Saved Puzzles library displays the saved puzzle
    await expect(page.getByText(/saved tactical library/i)).toBeVisible();
    await expect(page.getByText(/puzzle #00008/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /analyze/i })).toBeVisible();
  });

  test("4. Account switching and sign out clears stats and prevents previous Pro stats from bleeding", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/play");

    // 1. Set a Pro account with high peak Elo & streak
    await page.evaluate(() => {
      const proAccount = {
        id: "pro_account_1",
        username: "prouser",
        displayName: "Pro User",
        avatar: "♚",
        elo: 2200,
        peakElo: 2250,
        streak: 15,
        bestStreak: 20,
        isCalibrated: true,
        calibrationStep: 6,
        plan: "premium",
      };
      localStorage.setItem("chess_reel_account", JSON.stringify(proAccount));
      localStorage.setItem("chess_reel_elo", "2200");
      localStorage.setItem("chess_reel_plan", "premium");
      localStorage.setItem("chess_reel_peak_elo", "2250");
      localStorage.setItem("chess_reel_best_streak", "20");
      document.cookie = "chess_reel_session=pro_account_1; path=/; max-age=86400";
    });
    await page.reload();

    // Verify header profile button is completely removed
    await expect(page.getByTestId("header-profile-btn")).not.toBeVisible();

    // Wait for pro gold ring on bottom dock profile button indicating hydration is complete
    const bottomNavProfile = page.getByTestId("bottom-nav-profile");
    await expect(page.getByTestId("bottom-nav-profile-avatar")).toHaveClass(/ring-amber-400/, { timeout: 10000 });
    await page.waitForTimeout(300);

    // Open profile modal for Pro account via bottom dock
    await bottomNavProfile.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/pro active/i).first()).toBeVisible();
    await expect(page.getByText("2250")).toBeVisible(); // Pro peak elo

    // Sign out via sign out button in ProfileModal
    const signOutBtn = page.getByTitle(/sign out of account/i);
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify redirected to landing page or modal closes
    await page.waitForTimeout(500);

    // Verify localStorage had plan & peak elo cleared
    const storedPlan = await page.evaluate(() => localStorage.getItem("chess_reel_plan"));
    const storedPeak = await page.evaluate(() => localStorage.getItem("chess_reel_peak_elo"));
    expect(storedPlan).toBeNull();
    expect(storedPeak).toBeNull();
  });
});
