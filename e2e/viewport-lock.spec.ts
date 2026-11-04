import { test, expect } from "@playwright/test";

test.describe("Route-Scoped Viewport Lock & Puzzle Gesture Isolation", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Visit homepage and sign in with the dedicated test account
    await page.goto("http://localhost:3000/");

    // Check if sign-in button is present (if not already authenticated)
    const signInBtn = page.getByRole("button", { name: "Sign In" });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await page.getByRole("textbox", { name: "Username or email" }).fill("devtest@doomchess.local");
      await page.getByRole("textbox", { name: "Password" }).fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("http://localhost:3000/play");
    }
  });

  test("1. Route-Scoped Viewport Lock strictly locks native vertical page scrolling on /play", async ({ page }) => {
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
});
