export type HapticPattern = 'move' | 'capture' | 'check' | 'solve' | 'blunder' | 'button' | 'select';

export class HapticEngine {
  private enabled: boolean = true;
  private iosLabel: HTMLLabelElement | null = null;
  private iosInput: HTMLInputElement | null = null;
  private lastTriggerTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const checkStored = () => {
        const saved = localStorage.getItem('doomchess_haptics') ?? localStorage.getItem('chess_reel_haptics');
        this.enabled = saved !== null ? (saved === 'true' || saved === '1') : true;
      };
      checkStored();

      if (typeof window.addEventListener === 'function') {
        window.addEventListener('doomchess-haptics-changed', checkStored);
      }

      // Mount fallback switch as soon as DOM is ready if needed
      if (typeof document !== 'undefined') {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          this.mountIosSwitch();
        } else if (typeof window.addEventListener === 'function') {
          window.addEventListener('DOMContentLoaded', () => this.mountIosSwitch(), { once: true });
        }
      }
    }
  }

  public mountIosSwitch() {
    if (typeof document === 'undefined') return;

    // Check if the root native switch exists first
    const nativeSwitch = document.getElementById('doomchess-native-taptic-switch') as HTMLInputElement | null;
    const nativeLabel = document.getElementById('doomchess-native-taptic-label') as HTMLLabelElement | null;
    if (nativeSwitch && nativeLabel) {
      this.iosInput = nativeSwitch;
      this.iosLabel = nativeLabel;
      return;
    }

    const existing = document.getElementById('doomchess-taptic-label') as HTMLLabelElement | null;
    if (existing) {
      this.iosLabel = existing;
      this.iosInput = document.getElementById('doomchess-taptic-input') as HTMLInputElement | null;
      return;
    }

    // Must remain inside viewport bounds with non-zero opacity (0.01) so iOS WebKit does not cull Taptics
    const wrapper = document.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.cssText =
      'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;overflow:hidden;';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'doomchess-taptic-input';
    input.setAttribute('switch', '');
    input.tabIndex = -1;

    const label = document.createElement('label');
    label.id = 'doomchess-taptic-label';
    label.htmlFor = 'doomchess-taptic-input';
    label.style.cssText = 'display:block;width:1px;height:1px;';

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    document.body.appendChild(wrapper);

    this.iosInput = input;
    this.iosLabel = label;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('doomchess_haptics', String(val));
      localStorage.setItem('chess_reel_haptics', val ? '1' : '0');
      if (typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new Event('doomchess-haptics-changed'));
        } catch {}
      }
    }
    if (val) this.trigger('button');
  }

  public trigger(type: HapticPattern = 'move') {
    if (!this.enabled || typeof window === 'undefined') return;

    // Debounce duplicate firing within the same 25ms gesture frame
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastTriggerTime < 25) return;
    this.lastTriggerTime = now;

    try {
      // 1. Android / Chromium Vibration API
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        const patterns: Record<HapticPattern, number | number[]> = {
          select: 6,
          button: 8,
          move: 12,
          capture: [18, 25, 22],
          check: [25, 30, 35],
          solve: [15, 40, 30],
          blunder: [45, 50, 60],
        };
        navigator.vibrate(patterns[type] ?? 10);
        return;
      }

      // 2. iOS Safari Programmatic Trigger Fallback
      if (typeof document !== 'undefined') {
        const nativeLabel = document.getElementById('doomchess-native-taptic-label') as HTMLLabelElement | null;
        if (nativeLabel) {
          nativeLabel.click();
          return;
        }
      }

      this.mountIosSwitch();
      if (this.iosLabel) {
        this.iosLabel.click();
      }
    } catch {
      // Fail silently if blocked by browser policy
    }
  }

  // Compatibility helpers
  public tap() {
    this.trigger('button');
  }

  public success() {
    this.trigger('solve');
  }

  public error() {
    this.trigger('blunder');
  }
}

export const haptics = new HapticEngine();
