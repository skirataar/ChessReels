import { test, expect } from "@playwright/test";

test.describe("Phase 4 - Step 1: Puzzle History & Anti-Repetition", () => {
  test("records solved puzzle in PuzzleHistory and excludes it from subsequent random puzzle requests", async ({
    request,
  }) => {
    const testUserId = `test_user_${Date.now()}`;

    // 1. Fetch a random puzzle for this user
    const res1 = await request.get(`/api/puzzle/random?elo=1000&userId=${testUserId}`);
    expect(res1.ok()).toBeTruthy();
    const puzzle1 = await res1.json();
    expect(puzzle1).toHaveProperty("id");
    expect(puzzle1).toHaveProperty("fen");

    // 2. Record the puzzle as solved in PuzzleHistory via /api/user/update-elo
    const updateRes = await request.post("/api/user/update-elo", {
      data: {
        puzzleRating: puzzle1.rating,
        currentUserElo: 1000,
        result: "win",
        userId: testUserId,
        puzzleId: puzzle1.id,
      },
    });
    expect(updateRes.ok()).toBeTruthy();

    // 3. Request a batch of 5 puzzles for this user within the same Elo range
    const resBatch = await request.get(
      `/api/puzzle/random?elo=1000&count=5&userId=${testUserId}`
    );
    expect(resBatch.ok()).toBeTruthy();
    const batch = await resBatch.json();
    expect(Array.isArray(batch)).toBeTruthy();
    expect(batch.length).toBeGreaterThan(0);

    // Verify none of the newly fetched puzzles match puzzle1.id (Anti-repetition guarantee)
    const returnedIds = batch.map((p: { id: string }) => p.id);
    expect(returnedIds).not.toContain(puzzle1.id);
  });
});
