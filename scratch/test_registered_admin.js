const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/admin");
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });

  // Log in with master key
  console.log("Logging into admin...");
  await page.fill('input[type="password"]', "chessreel_admin_master_2026");
  
  const [statsResponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/admin/stats") && r.status() === 200),
    page.click('button[type="submit"]')
  ]);

  console.log("Stats loaded successfully!");
  await page.waitForTimeout(1000);

  // Screenshot Overview Tab
  await page.screenshot({ path: "/home/skirataar/.gemini/antigravity-ide/brain/53803d71-613c-470b-aba0-166c10c5831e/admin_registered_overview.png", fullPage: true });
  console.log("Captured updated admin_registered_overview.png");

  await browser.close();
}

main().catch(console.error);
