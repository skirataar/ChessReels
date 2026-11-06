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

const TARGET_USER = {
  id: "edfdda46-61d5-40b2-a244-8134e62afd67",
  email: "skirataar1@gmail.com",
  username: "skira",
  displayName: "skira",
  avatar: "♟",
  elo: 1439,
  isCalibrated: true,
  calibrationStep: 6,
  plan: "premium",
};

test.describe("Dark Luxury Calibration, Leaderboard Redesign & Two-Way Friend Requests", () => {
  test.beforeEach(async ({ request }) => {
    // Clean up any existing friend / request relationships between devtest and target user
    try {
      await request.delete("http://localhost:3000/api/friends", {
        data: {
          userId: DEVTEST_USER.id,
          friendId: TARGET_USER.id,
        },
      });
    } catch {}
  });

  test.afterEach(async ({ request }) => {
    try {
      await request.delete("http://localhost:3000/api/friends", {
        data: {
          userId: DEVTEST_USER.id,
          friendId: TARGET_USER.id,
        },
      });
    } catch {}
  });

  test("1. Leaderboard modal has 3 dark luxury segmented tabs, no neon green, no fake chips, and clean rank numbers", async ({
    page,
  }) => {
    await page.goto("/play");

    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);

    await page.reload();
    await page.waitForSelector('[data-testid="header-rank-btn"]', { timeout: 10_000 });

    // Open Leaderboard modal
    await page.click('[data-testid="header-rank-btn"]');
    const modal = page.locator('[data-testid="leaderboard-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 1. Verify Dark Luxury surface class
    const modalClass = await modal.getAttribute("class");
    expect(modalClass).toContain("bg-[#12100e]");
    expect(modalClass).toContain("border-white/[0.08]");

    // 2. Verify 3 segmented tabs exist
    await expect(page.locator('[data-testid="tab-global"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-friends"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-requests"]')).toBeVisible();

    // 3. Verify Global Standings has clean rank numbers (#1, #2, etc.) and NO medal emojis
    const textContent = await modal.innerText();
    expect(textContent).not.toContain("🥇");
    expect(textContent).not.toContain("🥈");
    expect(textContent).not.toContain("🥉");
    expect(textContent).toContain("#1");
    expect(textContent).toContain("#2");

    // 4. Verify user's row (YOU) is styled with subtle gold hairline
    const userRow = page.locator('[data-testid="global-user-row"]');
    await expect(userRow).toBeVisible();
    const userRowClass = await userRow.getAttribute("class");
    expect(userRowClass).toContain("bg-[#c29b78]/[0.06]");
    expect(userRowClass).toContain("border-[#c29b78]/25");

    // 5. Switch to Friends tab
    await page.click('[data-testid="tab-friends"]');
    await expect(page.locator('[data-testid="add-friend-input"]')).toBeVisible();

    // 6. Verify fake suggestion chips are completely removed
    const friendsText = await modal.innerText();
    expect(friendsText).not.toContain("Try adding tactical challengers");
    expect(friendsText).not.toContain("+tactics_pro");
    expect(friendsText).not.toContain("+hikaru_fan");

    // 7. Verify bottom button is subtle secondary
    const backBtn = page.getByRole("button", { name: /back to reels/i });
    await expect(backBtn).toBeVisible();
    const backBtnClass = await backBtn.getAttribute("class");
    expect(backBtnClass).toContain("bg-white/[0.04]");

    // Close modal
    await backBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test("2. Two-Way Friend Request Workflow: Send Request, Pending State, Incoming Badge, Accept & Decline", async ({
    page,
    request,
  }) => {
    await page.goto("/play");

    await page.evaluate((user) => {
      localStorage.setItem("chess_reel_account", JSON.stringify(user));
      localStorage.setItem("chess_reel_elo", String(user.elo));
      document.cookie = `chess_reel_session=${user.id}; path=/; max-age=86400`;
    }, DEVTEST_USER);

    await page.reload();
    await page.waitForSelector('[data-testid="header-rank-btn"]', { timeout: 10_000 });

    // Open Leaderboard modal & switch to Friends tab
    await page.click('[data-testid="header-rank-btn"]');
    await page.click('[data-testid="tab-friends"]');

    // Case A: Send request to self -> error
    await page.fill('[data-testid="add-friend-input"]', DEVTEST_USER.username);
    await page.click('[data-testid="add-friend-submit-btn"]');
    const errorMsg = page.locator('[data-testid="friend-error-msg"]');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/cannot send a friend request to yourself/i);

    // Case B: Send request to nonexistent user -> error
    await page.fill('[data-testid="add-friend-input"]', "unknown_player_999xyz");
    await page.click('[data-testid="add-friend-submit-btn"]');
    await expect(errorMsg).toContainText(/no player found/i);

    // Case C: Send request to existing target user -> success & pending state
    await page.fill('[data-testid="add-friend-input"]', TARGET_USER.username);
    await page.click('[data-testid="add-friend-submit-btn"]');
    const successMsg = page.locator('[data-testid="friend-success-msg"]');
    await expect(successMsg).toBeVisible({ timeout: 5000 });
    await expect(successMsg).toContainText(new RegExp(`Request sent to @${TARGET_USER.username}`, "i"));

    // Verify Outgoing Pending row appears
    const outgoingRow = page.locator('[data-testid="outgoing-request-row"]').first();
    await expect(outgoingRow).toBeVisible();
    await expect(outgoingRow).toContainText(TARGET_USER.username);

    // Cancel the outgoing request
    const cancelBtn = outgoingRow.getByRole("button", { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(outgoingRow).not.toBeVisible();
    }

    // Case D: Simulate incoming request (targetUser -> devtestUser) via API
    const createReqRes = await request.post("http://localhost:3000/api/friends", {
      data: {
        userId: TARGET_USER.id,
        targetUsername: DEVTEST_USER.username,
      },
    });
    expect(createReqRes.ok()).toBeTruthy();

    // Reload page to verify header notification dot and requests tab badge
    await page.reload();
    await page.waitForSelector('[data-testid="header-rank-btn"]', { timeout: 10_000 });

    // Header notification dot should be visible
    const headerDot = page.locator('[data-testid="header-friend-requests-dot"]');
    await expect(headerDot).toBeVisible({ timeout: 5000 });

    // Open Leaderboard modal
    await page.click('[data-testid="header-rank-btn"]');

    // Requests tab badge should show count 1
    const reqBadge = page.locator('[data-testid="requests-tab-badge"]');
    await expect(reqBadge).toBeVisible();
    await expect(reqBadge).toHaveText("1");

    // Switch to Requests tab
    await page.click('[data-testid="tab-requests"]');
    const incomingCard = page.locator('[data-testid="incoming-request-card"]').first();
    await expect(incomingCard).toBeVisible();
    await expect(incomingCard).toContainText(TARGET_USER.username);

    // Accept incoming request
    const acceptBtn = page.locator('[data-testid="accept-friend-btn"]').first();
    await acceptBtn.click();

    // Verify confirmation and request accepted
    await expect(page.locator('[data-testid="no-incoming-requests"]')).toBeVisible({ timeout: 10_000 });

    // Switch to Friends tab -> verify target user is now in Friends Leaderboard
    await page.click('[data-testid="tab-friends"]');
    const friendRow = page.locator('[data-testid="friend-row"]').first();
    await expect(friendRow).toBeVisible();
    await expect(friendRow).toContainText(TARGET_USER.username);
  });
});
