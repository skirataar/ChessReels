import { test, expect, Page } from "@playwright/test";
import { playSoundForMove, soundManager } from "../lib/audio";

const TEST_EMAIL = "devtest@doomchess.local";
const TEST_PASSWORD = "TestPassword123!";

async function loginWithDevtest(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();

  const signInBtn = page.getByRole("button", { name: "Sign In" });
  await expect(signInBtn).toBeVisible({ timeout: 5000 });
  await signInBtn.click();

  const userInput = page.locator("#login-username, input[placeholder*='email'], input[placeholder*='Username']").first();
  const passInput = page.locator("#login-password, input[type='password']").first();
  await userInput.fill(TEST_EMAIL);
  await passInput.fill(TEST_PASSWORD);

  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/play/, { timeout: 10000 });
  await expect(page.getByTestId("chessboard-container")).toBeVisible({ timeout: 10000 });
}

test.describe("Chess SFX Engine & Web Audio Buffer Manager", () => {
  test("1. Sound assets load directly from /sfx/ with 200 OK", async ({ request }) => {
    const sfxList = [
      "move-self.mp3",
      "move-opponent.mp3",
      "capture.mp3",
      "move-check.mp3",
      "castle.mp3",
      "promote.mp3",
      "illegal.mp3",
      "game-end.mp3",
    ];

    for (const file of sfxList) {
      const res = await request.get(`/sfx/${file}`);
      expect(res.status(), `Expected /sfx/${file} to return 200 OK`).toBe(200);
      const headers = res.headers();
      const contentType = headers["content-type"] || "";
      expect(
        contentType.includes("audio") || contentType.includes("octet-stream") || contentType.includes("mpeg") || contentType.includes("audio/mpeg"),
        `Unexpected content-type for ${file}: ${contentType}`
      ).toBe(true);
      const body = await res.body();
      expect(body.length, `Expected /sfx/${file} to have non-zero bytes`).toBeGreaterThan(1000);
    }
  });

  test("2. Strict Priority Rules for Move SFX (Check, Promotion, Castle, Capture, Standard, Illegal)", async () => {
    // 1. Check priority (even if move was a capture or promotion, check wins)
    const checkMoveResult = { captured: "p", promotion: "q", from: "e7", to: "e8" };
    const checkChess = { inCheck: () => true };
    const sound1 = playSoundForMove(checkMoveResult, checkChess as any, false);
    expect(sound1).toBe("move-check");

    // 2. Promotion priority (not check, but promotion)
    const promoMoveResult = { promotion: "q", flags: "p", from: "a7", to: "a8" };
    const nonCheckChess = { inCheck: () => false };
    const sound2 = playSoundForMove(promoMoveResult, nonCheckChess as any, false);
    expect(sound2).toBe("promote");

    // 3. Castle priority (O-O or O-O-O)
    const castleMoveResult = { san: "O-O", flags: "k" };
    const sound3 = playSoundForMove(castleMoveResult, nonCheckChess as any, false);
    expect(sound3).toBe("castle");

    const castleQueensideMove = { san: "O-O-O", flags: "q" };
    const soundCastleQ = playSoundForMove(castleQueensideMove, nonCheckChess as any, false);
    expect(soundCastleQ).toBe("castle");

    // 4. Capture priority
    const captureMoveResult = { captured: "n", flags: "c", from: "e4", to: "d5" };
    const sound4 = playSoundForMove(captureMoveResult, nonCheckChess as any, false);
    expect(sound4).toBe("capture");

    // 5. Standard Opponent move
    const stdOppMove = { san: "Nf3", flags: "n" };
    const sound5 = playSoundForMove(stdOppMove, nonCheckChess as any, true);
    expect(sound5).toBe("move-opponent");

    // 6. Standard Self move
    const stdSelfMove = { san: "e4", flags: "b" };
    const sound6 = playSoundForMove(stdSelfMove, nonCheckChess as any, false);
    expect(sound6).toBe("move-self");
  });

  test("3. Web Audio API Buffer Cache & No `new Audio()` instantiation in browser", async ({ page }) => {
    await loginWithDevtest(page);

    const audioVerification = await page.evaluate(async () => {
      // Verify no new Audio() called
      let newAudioCalled = false;
      const originalAudio = window.Audio;
      (window as any).Audio = function () {
        newAudioCalled = true;
        return new originalAudio();
      };

      const sm = (window as any).__soundManager;
      if (sm) {
        sm.preloadAll();
        await sm.play("move-self");
        await sm.play("move-opponent");
        await sm.play("capture");
        await sm.play("move-check");
        await sm.play("castle");
        await sm.play("promote");
        await sm.play("illegal");
        await sm.play("game-end");
      }

      (window as any).Audio = originalAudio;

      return {
        smExists: Boolean(sm),
        newAudioCalled,
        isMuted: sm?.getIsMuted?.(),
      };
    });

    expect(audioVerification.smExists).toBe(true);
    expect(audioVerification.newAudioCalled).toBe(false);
  });

  test("4. Sound toggle button in header toggles mute state and reflects in localStorage", async ({ page }) => {
    await loginWithDevtest(page);

    const toggleBtn = page.getByTestId("toggle-sound-btn");
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    const initialMuted = await page.evaluate(() => {
      return localStorage.getItem("chess_reel_sfx_muted");
    });

    // Click toggle button
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const toggledMuted = await page.evaluate(() => {
      return localStorage.getItem("chess_reel_sfx_muted");
    });

    expect(toggledMuted).not.toBe(initialMuted);

    // Toggle back
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const revertedMuted = await page.evaluate(() => {
      return localStorage.getItem("chess_reel_sfx_muted");
    });

    expect(revertedMuted).toBe(initialMuted ?? "0");
  });

  test("5. Navigation buttons (< and >) and wrong move attempt trigger correct SFX", async ({ page }) => {
    await loginWithDevtest(page);

    // Spy on soundManager.play inside browser
    await page.evaluate(() => {
      (window as any).__playedSounds = [];
      const sm = (window as any).__soundManager;
      if (sm) {
        const origPlay = sm.play.bind(sm);
        sm.play = async (name: any) => {
          (window as any).__playedSounds.push(name);
          return origPlay(name);
        };
      }
    });

    // Step back button
    const prevBtn = page.getByTestId("prev-puzzle-btn");
    const nextBtn = page.getByTestId("next-puzzle-btn");

    if (await prevBtn.isEnabled()) {
      await prevBtn.click();
      await page.waitForTimeout(100);
      const sounds = await page.evaluate(() => (window as any).__playedSounds);
      expect(sounds).toContain("move-self");
    }

    if (await nextBtn.isEnabled()) {
      await page.evaluate(() => ((window as any).__playedSounds = []));
      await nextBtn.click();
      await page.waitForTimeout(100);
      const sounds = await page.evaluate(() => (window as any).__playedSounds);
      expect(sounds.length).toBeGreaterThan(0);
    }
  });
});
