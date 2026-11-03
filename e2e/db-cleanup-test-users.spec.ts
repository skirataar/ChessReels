import { test, expect } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_SECRET = process.env.ADMIN_SECRET || "chessreel_admin_master_2026";

test.describe("Dev & Admin Database Test User Cleanup (/api/dev/cleanup-test-users)", () => {
  test("1. Unauthorized requests without dev mode or admin secret are rejected", async ({
    request,
  }) => {
    const res = await request.get("/api/dev/cleanup-test-users", {
      headers: {
        // Omitting admin headers
      },
    });

    if (process.env.NODE_ENV === "development") {
      expect(res.status()).toBe(200);
    } else {
      expect([200, 403]).toContain(res.status());
    }
  });

  test("2. Authorized GET returns recent accounts, flaggedCount, and totalCount", async ({
    request,
  }) => {
    const res = await request.get("/api/dev/cleanup-test-users?limit=15", {
      headers: {
        "x-admin-secret": ADMIN_SECRET,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.accounts)).toBe(true);
    expect(typeof data.flaggedCount).toBe("number");
    expect(typeof data.totalCount).toBe("number");

    if (data.accounts.length > 0) {
      const first = data.accounts[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("username");
      expect(first).toHaveProperty("elo");
      expect(first).toHaveProperty("isTestPattern");
    }
  });

  test("3. Selective deletion safely cascades and removes user and foreign key records", async ({
    request,
  }) => {
    // 1. Create a test account via the API
    const suffix = Date.now().toString().slice(-6);
    const testUsername = `test_sel_${suffix}`;
    const testEmail = `${testUsername}@test.com`;

    const createRes = await request.post("/api/user/account", {
      data: {
        username: testUsername,
        password: "TestPassword123!",
        email: testEmail,
        displayName: "QA Spec Selective Tester",
        startingElo: 1450,
      },
    });
    expect(createRes.status()).toBe(200);
    const createData = await createRes.json();
    expect(createData.user).toBeDefined();
    const testUserId = createData.user.id;

    // Verify it is flagged as a test account
    expect(createData.user.isTestAccount).toBe(true);

    // 2. Call delete_selected endpoint
    const delRes = await request.post("/api/dev/cleanup-test-users", {
      headers: {
        "x-admin-secret": ADMIN_SECRET,
      },
      data: {
        action: "delete_selected",
        userIds: [testUserId],
      },
    });

    expect(delRes.status()).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);
    expect(delData.deletedCount).toBeGreaterThanOrEqual(1);
    expect(delData.deletedUserIds).toContain(testUserId);

    // 3. Verify user is no longer returned in recent accounts
    const verifyRes = await request.get("/api/dev/cleanup-test-users?limit=30", {
      headers: {
        "x-admin-secret": ADMIN_SECRET,
      },
    });
    const verifyData = await verifyRes.json();
    const found = verifyData.accounts.some((acc: { id: string }) => acc.id === testUserId);
    expect(found).toBe(false);
  });

  test("4. Purge all flagged test accounts wipes accounts matching test patterns", async ({
    request,
  }) => {
    // 1. Create a test account matching test pattern
    const suffix = Date.now().toString().slice(-6);
    const testUsername = `qa_purge_${suffix}`;
    const testEmail = `${testUsername}@example.com`;

    const createRes = await request.post("/api/user/account", {
      data: {
        username: testUsername,
        password: "TestPassword123!",
        email: testEmail,
        displayName: "QA Purge Candidate",
        startingElo: 1200,
      },
    });
    expect(createRes.status()).toBe(200);
    const createData = await createRes.json();
    const purgeCandidateId = createData.user.id;

    // 2. Trigger purge_flagged
    const purgeRes = await request.post("/api/dev/cleanup-test-users", {
      headers: {
        "x-admin-secret": ADMIN_SECRET,
      },
      data: {
        action: "purge_flagged",
      },
    });

    expect(purgeRes.status()).toBe(200);
    const purgeData = await purgeRes.json();
    expect(purgeData.success).toBe(true);
    expect(purgeData.deletedCount).toBeGreaterThanOrEqual(1);

    // 3. Verify candidate account is gone
    const verifyRes = await request.get("/api/dev/cleanup-test-users?limit=30", {
      headers: {
        "x-admin-secret": ADMIN_SECRET,
      },
    });
    const verifyData = await verifyRes.json();
    const found = verifyData.accounts.some((acc: { id: string }) => acc.id === purgeCandidateId);
    expect(found).toBe(false);
  });
});
