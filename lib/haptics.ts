export type HapticPattern = 'move' | 'capture' | 'check' | 'solve' | 'blunder' | 'button';

export class HapticEngine {
  private enabled: boolean = true;
  private iosSwitchLabel: HTMLLabelElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('doomchess_haptics') ?? localStorage.getItem('chess_reel_haptics');
      this.enabled = saved !== null ? (saved === 'true' || saved === '1') : true;
    }
  }

  private ensureIosSwitch() {
    if (typeof document === 'undefined' || this.iosSwitchLabel) return;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.left = '-9999px';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'doomchess-ios-haptic-switch';
    input.setAttribute('switch', '');

    const label = document.createElement('label');
    label.htmlFor = 'doomchess-ios-haptic-switch';

    container.appendChild(input);
    container.appendChild(label);
    document.body.appendChild(container);
    this.iosSwitchLabel = label;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('doomchess_haptics', String(val));
      localStorage.setItem('chess_reel_haptics', val ? '1' : '0');
    }
    if (val) this.trigger('button');
  }

  public trigger(type: HapticPattern) {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      // 1. Standard Vibration API (Android / supported browsers)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        switch (type) {
          case 'button':
            navigator.vibrate(8);
            break;
          case 'move':
            navigator.vibrate(12);
            break;
          case 'capture':
            navigator.vibrate([18, 25, 22]);
            break;
          case 'check':
            navigator.vibrate([25, 30, 35]);
            break;
          case 'solve':
            navigator.vibrate([15, 40, 30]);
            break;
          case 'blunder':
            navigator.vibrate([45, 50, 60]);
            break;
        }
        return;
      }

      // 2. iOS Safari Taptic Engine Fallback (iOS 17.4+ switch attribute)
      this.ensureIosSwitch();
      if (this.iosSwitchLabel) {
        this.iosSwitchLabel.click();
        if (type === 'solve' || type === 'blunder' || type === 'capture') {
          setTimeout(() => this.iosSwitchLabel?.click(), 65);
        }
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
