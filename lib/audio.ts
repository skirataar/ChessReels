/**
 * Web Audio API Sound Manager for Chess Reel.
 * Pre-decodes and caches audio buffers from /sfx/ to eliminate latency,
 * prevents browser media element exhaustion (no `new Audio()`),
 * and auto-unlocks AudioContext on user interaction for mobile/desktop.
 */

export type SoundName =
  | "move-self"
  | "move-opponent"
  | "capture"
  | "move-check"
  | "castle"
  | "promote"
  | "illegal"
  | "game-end";

export interface MoveLike {
  san?: string;
  flags?: string;
  captured?: string;
  promotion?: string;
  piece?: string;
  from?: string;
  to?: string;
  color?: string;
}

export interface ChessLike {
  inCheck?: () => boolean;
  isCheckmate?: () => boolean;
  in_check?: () => boolean;
}

const SFX_MUTED_STORAGE_KEY = "chess_reel_sfx_muted";

export const ALL_SFX: SoundName[] = [
  "move-self",
  "move-opponent",
  "capture",
  "move-check",
  "castle",
  "promote",
  "illegal",
  "game-end",
];

export class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Map<SoundName, AudioBuffer> = new Map();
  private loadingPromises: Map<SoundName, Promise<AudioBuffer | null>> = new Map();
  private isMuted: boolean = false;
  private hasUnlocked: boolean = false;
  private hasAttachedUnlockListeners: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(SFX_MUTED_STORAGE_KEY);
        if (saved !== null) {
          this.isMuted = saved === "1";
        }
      } catch {}

      this.setupUnlockListeners();
    }
  }

  private setupUnlockListeners() {
    if (typeof window === "undefined" || this.hasAttachedUnlockListeners) return;
    this.hasAttachedUnlockListeners = true;

    const unlock = () => {
      this.unlockAudioContext();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
  }

  public unlockAudioContext() {
    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    this.hasUnlocked = true;
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SFX_MUTED_STORAGE_KEY, this.isMuted ? "1" : "0");
      } catch {}
    }
    return this.isMuted;
  }

  public setIsMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SFX_MUTED_STORAGE_KEY, this.isMuted ? "1" : "0");
      } catch {}
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Pre-fetches and decodes an audio buffer into memory.
   * Deduplicates concurrent loads via loadingPromises cache.
   */
  public async loadSound(name: SoundName): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) {
      return this.buffers.get(name)!;
    }
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    const loadPromise = (async () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return null;

        const response = await fetch(`/sfx/${name}.mp3`);
        if (!response.ok) {
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();

        // Cross-browser decode with Promise wrapper around callback style
        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(arrayBuffer, resolve, reject);
        });

        this.buffers.set(name, audioBuffer);
        return audioBuffer;
      } catch {
        return null;
      } finally {
        this.loadingPromises.delete(name);
      }
    })();

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Preloads all sound effects into memory.
   */
  public preloadAll(): void {
    if (typeof window === "undefined") return;
    for (const name of ALL_SFX) {
      this.loadSound(name).catch(() => {});
    }
  }

  /**
   * Plays a pre-decoded audio buffer via lightweight AudioBufferSourceNode.
   */
  public async play(name: SoundName, volume: number = 1.0): Promise<void> {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      let buffer = this.buffers.get(name);
      if (!buffer) {
        buffer = (await this.loadSound(name)) || undefined;
      }

      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
      } else {
        // Fallback synthesizers if audio file unavailable
        if (name === "game-end") {
          this.playSuccessSynth();
        } else if (name === "illegal") {
          this.playErrorSynth();
        } else {
          this.playClickSynth();
        }
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Priority Move Sound Dispatcher:
   * Priority 1 (Check / Checkmate): move-check (and triggers game-end 150ms later if isSolved)
   * Priority 2 (Promotion): promote
   * Priority 3 (Castling): castle
   * Priority 4 (Capture): capture
   * Priority 5 (Standard Move): move-opponent (if opponent) or move-self
   */
  public playSoundForMove(
    moveResult: MoveLike | null | undefined,
    chessInstance: ChessLike | null | undefined,
    isOpponentMove: boolean = false,
    isSolved: boolean = false
  ): SoundName {
    const inCheck = Boolean(
      chessInstance?.inCheck?.() ||
      chessInstance?.isCheckmate?.() ||
      chessInstance?.in_check?.()
    );

    let soundName: SoundName;

    if (inCheck) {
      soundName = "move-check";
    } else if (moveResult?.promotion || moveResult?.flags?.includes("p")) {
      soundName = "promote";
    } else if (
      moveResult?.san === "O-O" ||
      moveResult?.san === "O-O-O" ||
      moveResult?.flags?.includes("k") ||
      moveResult?.flags?.includes("q")
    ) {
      soundName = "castle";
    } else if (
      moveResult?.captured ||
      moveResult?.flags?.includes("c") ||
      moveResult?.flags?.includes("e")
    ) {
      soundName = "capture";
    } else if (isOpponentMove) {
      soundName = "move-opponent";
    } else {
      soundName = "move-self";
    }

    this.play(soundName);

    if (isSolved) {
      setTimeout(() => {
        this.play("game-end");
      }, 150);
    }

    return soundName;
  }

  // Convenient semantic aliases
  public playMove() {
    this.play("move-self");
  }

  public playOpponentMove() {
    this.play("move-opponent");
  }

  public playCapture() {
    this.play("capture");
  }

  public playCheck() {
    this.play("move-check");
  }

  public playCastle() {
    this.play("castle");
  }

  public playPromote() {
    this.play("promote");
  }

  public playIllegal() {
    this.play("illegal");
  }

  public playError() {
    this.play("illegal");
  }

  public playSuccess() {
    this.play("game-end");
  }

  public playGameEnd() {
    this.play("game-end");
  }

  // Pure Web Audio Synth Fallbacks
  private playClickSynth() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  private playErrorSynth() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  private playSuccessSynth() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      const startTime = ctx.currentTime;
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index === notes.length - 1 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, startTime + index * 0.09);
        gain.gain.setValueAtTime(0.001, startTime + index * 0.09);
        gain.gain.linearRampToValueAtTime(0.25, startTime + index * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + index * 0.09 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime + index * 0.09);
        osc.stop(startTime + index * 0.09 + 0.45);
      });
    } catch {}
  }
}

export const soundManager = new SoundManager();
export const sounds = soundManager;

export function playSoundForMove(
  moveResult: MoveLike | null | undefined,
  chessInstance: ChessLike | null | undefined,
  isOpponentMove: boolean = false,
  isSolved: boolean = false
): SoundName {
  return soundManager.playSoundForMove(moveResult, chessInstance, isOpponentMove, isSolved);
}
