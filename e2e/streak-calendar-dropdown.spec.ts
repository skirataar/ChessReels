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
    await page.fill('input[placeholder="Username or email"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
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

test.describe("Streak Calendar & Freezes Dropdown Menu", () => {
  test("1. Clicking streak opens dropdown with calendar and streak freezes amount", async ({ page }) => {
    await loginAsDedicatedTestUser(page);

    const trigger = page.getByTestId("header-streak-dropdown-trigger");
    await expect(trigger).toBeVisible({ timeout: 8000 });

    // Open dropdown
    await trigger.click();

    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 4000 });

    // Header has month/year title
    await expect(dropdown).toContainText("2026");

    // Weekday headers: M, T, W, T, F, S, S
    await expect(dropdown).toContainText("M");
    await expect(dropdown).toContainText("T");
    await expect(dropdown).toContainText("W");
    await expect(dropdown).toContainText("F");
    await expect(dropdown).toContainText("S");

    // Under the calendar: Streak Freezes amount is shown
    const freezeCount = page.getByTestId("dropdown-freeze-count");
    await expect(freezeCount).toBeVisible();
    await expect(freezeCount).toContainText("/ 2");

    // Visual freeze slots
    await expect(dropdown).toContainText("Freeze 1");
    await expect(dropdown).toContainText("Freeze 2");
    await expect(dropdown).toContainText("Earn next freeze");

    // Close via close button
    const closeBtn = page.locator('[aria-label="Close"]');
    await closeBtn.click();
    await expect(dropdown).not.toBeVisible();
  });

  test("2. Pressing Escape key closes the dropdown cleanly", async ({ page }) => {
    await loginAsDedicatedTestUser(page);

    const trigger = page.getByTestId("header-streak-dropdown-trigger");
    await trigger.click();

    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dropdown).not.toBeVisible();
  });

  test("3. Dropdown fits within 390px mobile viewport without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsDedicatedTestUser(page);

    const trigger = page.getByTestId("header-streak-dropdown-trigger");
    await trigger.click();

    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible();

    const bounds = await dropdown.boundingBox();
    expect(bounds).not.toBeNull();
    if (bounds) {
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    }
  });

  test("4. Interactive dropdown works in /temp-qa simulator module", async ({ page }) => {
    await page.goto("http://localhost:3000/temp-qa");
    await page.waitForSelector('[data-testid="qa-streak-dropdown-trigger"]');

    const qaTrigger = page.getByTestId("qa-streak-dropdown-trigger");
    await qaTrigger.click();

    const dropdown = page.getByTestId("streak-calendar-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toContainText("Streak Freezes");
    await expect(dropdown).toContainText("Freeze 1");
    await expect(dropdown).toContainText("Freeze 2");

    await page.keyboard.press("Escape");
    await expect(dropdown).not.toBeVisible();
  });
});
