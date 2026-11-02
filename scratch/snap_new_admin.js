const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/admin...");
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });

  // Fill in master key
  console.log("Unlocking console with master key...");
  await page.fill('input[type="password"]', "chessreel_admin_master_2026");
  await page.getByRole("button", { name: /unlock admin console/i }).click();

  // Wait for metrics response & dashboard
  await page.waitForResponse(res => res.url().includes('/api/admin/stats') && res.status() === 200, { timeout: 10000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "/home/skirataar/.gemini/antigravity-ide/brain/53803d71-613c-470b-aba0-166c10c5831e/executive_admin_dashboard.png" });
  console.log("Captured updated executive_admin_dashboard.png");

  // Click on Active Community tab
  console.log("Navigating to Active Community tab...");
  await page.getByRole("button", { name: /active community/i }).click();
  await page.waitForResponse(res => res.url().includes('/api/admin/users') && res.status() === 200, { timeout: 10000 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: "/home/skirataar/.gemini/antigravity-ide/brain/53803d71-613c-470b-aba0-166c10c5831e/executive_community_users.png" });
  console.log("Captured updated executive_community_users.png");

  await browser.close();
  console.log("Done!");
})();
