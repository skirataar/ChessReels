/**
 * Lightweight, zero-asset Web Audio API synthesizer for Chess Reel.
 * Works natively in all modern mobile and desktop browsers without downloading audio files.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("chess_reel_sfx_muted");
        if (saved !== null) {
          this.isMuted = saved === "1";
        }
      } catch {}
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chess_reel_sfx_muted", this.isMuted ? "1" : "0");
      } catch {}
    }
    return this.isMuted;
  }

  setIsMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chess_reel_sfx_muted", this.isMuted ? "1" : "0");
      } catch {}
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
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
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Crisp, subtle wooden click when a piece drops
   */
  playMove() {
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
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Triumphant ascending harmonic fanfare on puzzle solve
   */
  playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
      const startTime = ctx.currentTime;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = index === notes.length - 1 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, startTime + index * 0.09);

        // Gentle attack and resonant decay
        gain.gain.setValueAtTime(0.001, startTime + index * 0.09);
        gain.gain.linearRampToValueAtTime(0.25, startTime + index * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + index * 0.09 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + index * 0.09);
        osc.stop(startTime + index * 0.09 + 0.45);
      });

      // Warm underlying root chord for depth and fullness
      const chordNotes = [261.63, 392.0]; // C4, G4
      chordNotes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime + 0.18);

        gain.gain.setValueAtTime(0.001, startTime + 0.18);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + 0.18);
        osc.stop(startTime + 0.7);
      });
    } catch {
      // Ignore audio policy errors
    }
  }

  /**
   * Distinct low buzz on incorrect move
   */
  playError() {
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
    } catch {
      // Ignore audio policy errors
    }
  }
}

export const sounds = new SoundEffects();
