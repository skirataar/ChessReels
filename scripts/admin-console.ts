#!/usr/bin/env tsx
import * as readline from "readline";
import prisma from "../lib/prisma";
import { purgeTestUsers, REGISTERED_USER_WHERE_CLAUSE } from "../lib/communitySeed";

const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "chessreel_admin_master_2026";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function authenticate(): Promise<boolean> {
  console.clear();
  console.log("\x1b[36m===================================================\x1b[0m");
  console.log("\x1b[1m\x1b[36m        CHESSREEL STANDALONE ADMIN CONSOLE        \x1b[0m");
  console.log("\x1b[36m===================================================\x1b[0m\n");

  const enteredKey = await ask("\x1b[33mEnter Admin Master Key: \x1b[0m");
  if (enteredKey.trim() !== ADMIN_SECRET) {
    console.log("\n\x1b[31m[ERROR] Invalid Master Key. Access Denied.\x1b[0m\n");
    return false;
  }

  console.log("\n\x1b[32m[SUCCESS] Key verified. Initializing secure mission control...\x1b[0m\n");
  return true;
}

let cachedPuzzleCount: number | null = null;

async function showMetrics() {
  console.clear();
  console.log("\x1b[36m--- PLATFORM METRICS & HEALTH ---\x1b[0m");
  const start = Date.now();
  if (!cachedPuzzleCount) {
    cachedPuzzleCount = await prisma.puzzle.count();
  }
  const [totalUsers, proUsers, calibratedUsers, likedPuzzles] =
    await Promise.all([
      prisma.user.count({ where: REGISTERED_USER_WHERE_CLAUSE }),
      prisma.user.count({
        where: { ...REGISTERED_USER_WHERE_CLAUSE, plan: "premium" },
      }),
      prisma.user.count({
        where: { ...REGISTERED_USER_WHERE_CLAUSE, isCalibrated: true },
      }),
      prisma.puzzle.count({ where: { likes: { gt: 0 } } }),
    ]);
  const latency = Date.now() - start;

  console.log(`- Database Latency: \x1b[32m${latency}ms\x1b[0m`);
  console.log(`- Registered Users: \x1b[1m${totalUsers}\x1b[0m`);
  console.log(`  - Free Tier Users: ${totalUsers - proUsers}`);
  console.log(`  - Premium Pro Subscribers: \x1b[33m${proUsers}\x1b[0m (Est. MRR: $${(proUsers * 9.99).toFixed(2)})`);
  console.log(`  - Calibrated Placement Solvers: ${calibratedUsers}`);
  console.log(`- Total Puzzles in DB: \x1b[35m${cachedPuzzleCount.toLocaleString()}\x1b[0m`);
  console.log(`- Community Liked Puzzles: ${likedPuzzles}`);
  console.log("\nPress Enter to return to menu...");
  await ask("");
}

async function listUsers() {
  console.clear();
  console.log("\x1b[36m--- REGISTERED USER DIRECTORY ---\x1b[0m");
  const users = await prisma.user.findMany({
    where: REGISTERED_USER_WHERE_CLAUSE,
    take: 50,
    orderBy: { elo: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatar: true,
      elo: true,
      plan: true,
      streak: true,
    },
  });

  if (users.length === 0) {
    console.log("No registered users found.");
  } else {
    console.table(
      users.map((u) => ({
        Name: u.displayName || u.username,
        Username: `@${u.username || "n/a"}`,
        Email: u.email || "n/a",
        Rating: `${u.elo} Elo`,
        Plan: u.plan === "premium" ? "👑 PRO ($9.99)" : "FREE",
        Streak: `${u.streak}d 🔥`,
      }))
    );
  }

  console.log("\nOptions:");
  console.log("1. Toggle User Subscription Plan (Free <-> Premium)");
  console.log("2. Adjust User Elo Rating");
  console.log("3. Return to Main Menu");

  const choice = await ask("Choose option (1-3): ");
  if (choice === "1") {
    const username = await ask("Enter username: ");
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          REGISTERED_USER_WHERE_CLAUSE,
          { username: username.trim().toLowerCase() },
        ],
      },
    });
    if (!user) {
      console.log("\x1b[31mUser not found.\x1b[0m");
    } else {
      const nextPlan = user.plan === "premium" ? "free" : "premium";
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: nextPlan },
      });
      console.log(`\x1b[32mUpdated @${user.username} plan to ${nextPlan.toUpperCase()}\x1b[0m`);
    }
    await ask("Press Enter to continue...");
  } else if (choice === "2") {
    const username = await ask("Enter username: ");
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          REGISTERED_USER_WHERE_CLAUSE,
          { username: username.trim().toLowerCase() },
        ],
      },
    });
    if (!user) {
      console.log("\x1b[31mUser not found.\x1b[0m");
    } else {
      const eloStr = await ask(`Current Elo: ${user.elo}. Enter new Elo: `);
      const newElo = parseInt(eloStr, 10);
      if (!isNaN(newElo)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { elo: newElo, peakElo: Math.max(newElo, user.peakElo) },
        });
        console.log(`\x1b[32mUpdated @${user.username} Elo to ${newElo}\x1b[0m`);
      }
    }
    await ask("Press Enter to continue...");
  }
}

async function searchPuzzles() {
  console.clear();
  console.log("\x1b[36m--- PUZZLE SEARCH ---\x1b[0m");
  const theme = await ask("Enter theme keyword (or press Enter for top rated): ");
  const puzzles = await prisma.puzzle.findMany({
    where: theme.trim() ? { themes: { contains: theme.trim() } } : undefined,
    take: 10,
    orderBy: { popularity: "desc" },
    select: {
      id: true,
      rating: true,
      themes: true,
      moves: true,
      likes: true,
    },
  });

  console.table(
    puzzles.map((p) => ({
      ID: p.id,
      Rating: p.rating,
      Likes: p.likes,
      Themes: p.themes.slice(0, 30),
      Moves: p.moves.slice(0, 20),
    }))
  );

  await ask("\nPress Enter to return to menu...");
}

async function configureTierLimitsCLI() {
  console.clear();
  console.log("\x1b[36m--- CONFIGURE TIER RULES & AD FREQUENCY ---\x1b[0m");
  const { getTierConfig, updateTierConfig } = await import("../lib/tierConfig");
  const config = await getTierConfig();
  console.log(`Current Configuration:`);
  console.log(`- Free Puzzle Limit: \x1b[33m${config.freePuzzleLimit}\x1b[0m puzzles`);
  console.log(`- Free Window Duration: \x1b[33m${config.freeWindowHours}\x1b[0m hours`);
  console.log(`- Ad Frequency: Every \x1b[33m${config.adFrequencyPuzzles}\x1b[0m puzzles`);
  console.log(`- Pro Monthly Price: \x1b[32m₹${config.proMonthlyPrice}\x1b[0m / month`);
  console.log(`- Annual Plan Discount: \x1b[32m${config.annualDiscountPercent}%\x1b[0m off (₹${Math.round(config.proMonthlyPrice * 12 * (1 - config.annualDiscountPercent / 100))}/year)\n`);

  console.log("Press Enter to keep current value, or type a new number:");
  const newLimitStr = await ask(`New Free Puzzle Limit (${config.freePuzzleLimit}): `);
  const newHoursStr = await ask(`New Free Window Hours (${config.freeWindowHours}): `);
  const newAdFreqStr = await ask(`New Ad Frequency (${config.adFrequencyPuzzles}): `);
  const newPriceStr = await ask(`New Pro Monthly Price (₹${config.proMonthlyPrice}): `);
  const newDiscountStr = await ask(`New Annual Discount % (${config.annualDiscountPercent}%): `);

  const updates: any = {};
  if (newLimitStr.trim()) updates.freePuzzleLimit = parseInt(newLimitStr.trim(), 10);
  if (newHoursStr.trim()) updates.freeWindowHours = parseInt(newHoursStr.trim(), 10);
  if (newAdFreqStr.trim()) updates.adFrequencyPuzzles = parseInt(newAdFreqStr.trim(), 10);
  if (newPriceStr.trim()) updates.proMonthlyPrice = parseInt(newPriceStr.trim(), 10);
  if (newDiscountStr.trim()) updates.annualDiscountPercent = parseInt(newDiscountStr.trim(), 10);

  if (Object.keys(updates).length > 0) {
    const updated = await updateTierConfig(updates);
    console.log(`\n\x1b[32m[SUCCESS] Tier rules updated: ${updated.freePuzzleLimit} puzzles / ${updated.freeWindowHours}h for Free tier. Ads every ${updated.adFrequencyPuzzles} puzzles. Pro: ₹${updated.proMonthlyPrice}/mo (${updated.annualDiscountPercent}% save annual).\x1b[0m`);
  } else {
    console.log("\n\x1b[33mNo changes made.\x1b[0m");
  }

  await ask("\nPress Enter to return to menu...");
}

async function purgeTestsCLI() {
  console.clear();
  console.log("\x1b[36m--- PURGE AUTOMATED TEST DEBRIS ---\x1b[0m");
  const count = await purgeTestUsers();
  console.log(`\x1b[32m[SUCCESS] Purged ${count} automated test & ghost accounts!\x1b[0m`);
  await ask("\nPress Enter to return to menu...");
}

async function mainMenu() {
  while (true) {
    console.clear();
    console.log("\x1b[36m===================================================\x1b[0m");
    console.log("\x1b[1m\x1b[36m             CHESSREEL MISSION CONTROL            \x1b[0m");
    console.log("\x1b[36m===================================================\x1b[0m\n");
    console.log("1. View System & Platform Telemetry");
    console.log("2. Manage Registered Users & Subscription Plans");
    console.log("3. Search & Inspect Puzzles");
    console.log("4. ⚙️  Configure Free Tier Limits & Ad Frequency");
    console.log("5. 🧹 Purge Automated Test Debris Accounts");
    console.log("6. Exit Console\n");

    const choice = await ask("\x1b[33mSelect an action (1-6): \x1b[0m");
    if (choice === "1") {
      await showMetrics();
    } else if (choice === "2") {
      await listUsers();
    } else if (choice === "3") {
      await searchPuzzles();
    } else if (choice === "4") {
      await configureTierLimitsCLI();
    } else if (choice === "5") {
      await purgeTestsCLI();
    } else if (choice === "6") {
      console.log("\n\x1b[32mGoodbye Admin.\x1b[0m\n");
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }
  }
}

async function run() {
  const ok = await authenticate();
  if (!ok) {
    rl.close();
    process.exit(1);
  }
  await mainMenu();
}

run().catch((e) => {
  console.error(e);
  rl.close();
  process.exit(1);
});
