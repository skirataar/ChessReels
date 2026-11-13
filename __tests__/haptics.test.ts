import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("Cross-Platform Haptic Engine", () => {
  let storageMap: Record<string, string>;
  let vibrateMock: ReturnType<typeof vi.fn>;
  let elementsCreated: any[];
  let labelClicked: boolean;

  beforeEach(async () => {
    vi.resetModules();
    storageMap = {};
    vibrateMock = vi.fn();
    elementsCreated = [];
    labelClicked = false;

    const mockStorage = {
      getItem: (key: string) => storageMap[key] ?? null,
      setItem: (key: string, val: string) => {
        storageMap[key] = val;
      },
      clear: () => {
        storageMap = {};
      },
    };

    const mockDocument = {
      readyState: "complete",
      createElement: (tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          style: {},
          setAttribute: (k: string, v: string) => {
            el[k] = v;
          },
          appendChild: (child: any) => {
            el.children = el.children || [];
            el.children.push(child);
          },
          click: () => {
            if (tag === "label") labelClicked = true;
          },
        };
        elementsCreated.push(el);
        return el;
      },
      getElementById: (id: string) => {
        return elementsCreated.find((el) => el.id === id) || null;
      },
      body: {
        appendChild: vi.fn(),
      },
    };

    (globalThis as any).window = globalThis;
    (globalThis as any).document = mockDocument;
    (globalThis as any).localStorage = mockStorage;
    Object.defineProperty(globalThis, "navigator", {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).localStorage;
    vi.restoreAllMocks();
  });

  it("defaults to enabled if not set in localStorage", async () => {
    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();
    expect(engine.isEnabled()).toBe(true);
  });

  it("respects saved localStorage setting", async () => {
    storageMap["doomchess_haptics"] = "false";
    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();
    expect(engine.isEnabled()).toBe(false);
  });

  it("persists enabled state when setEnabled is called", async () => {
    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();
    engine.setEnabled(false);
    expect(engine.isEnabled()).toBe(false);
    expect(storageMap["doomchess_haptics"]).toBe("false");
    expect(storageMap["chess_reel_haptics"]).toBe("0");

    engine.setEnabled(true);
    expect(engine.isEnabled()).toBe(true);
    expect(storageMap["doomchess_haptics"]).toBe("true");
    expect(storageMap["chess_reel_haptics"]).toBe("1");
  });

  it("triggers correct vibration patterns on Android / supported browsers", async () => {
    let mockTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => {
      mockTime += 100;
      return mockTime;
    });

    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();

    engine.trigger("select");
    expect(vibrateMock).toHaveBeenLastCalledWith(6);

    engine.trigger("button");
    expect(vibrateMock).toHaveBeenLastCalledWith(8);

    engine.trigger("move");
    expect(vibrateMock).toHaveBeenLastCalledWith(12);

    engine.trigger("capture");
    expect(vibrateMock).toHaveBeenLastCalledWith([18, 25, 22]);

    engine.trigger("check");
    expect(vibrateMock).toHaveBeenLastCalledWith([25, 30, 35]);

    engine.trigger("solve");
    expect(vibrateMock).toHaveBeenLastCalledWith([15, 40, 30]);

    engine.trigger("blunder");
    expect(vibrateMock).toHaveBeenLastCalledWith([45, 50, 60]);
  });

  it("debounces rapid duplicate triggers within 25ms", async () => {
    let mockTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => mockTime);

    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();

    engine.trigger("select");
    expect(vibrateMock).toHaveBeenCalledTimes(1);

    // Call again within 10ms
    mockTime += 10;
    engine.trigger("move");
    expect(vibrateMock).toHaveBeenCalledTimes(1);

    // Call after 30ms (total +40ms)
    mockTime += 30;
    engine.trigger("move");
    expect(vibrateMock).toHaveBeenCalledTimes(2);
  });

  it("does not trigger vibration when disabled", async () => {
    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();
    engine.setEnabled(false);
    vibrateMock.mockClear();

    engine.trigger("move");
    engine.trigger("solve");
    engine.trigger("blunder");
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it("falls back to iOS Safari switch attribute click when navigator.vibrate is unavailable", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });
    const { HapticEngine } = await import("../lib/haptics");
    const engine = new HapticEngine();
    engine.trigger("button");

    expect(labelClicked).toBe(true);
    const hasSwitchInput = elementsCreated.some((el) => el.id === "doomchess-taptic-input" && el.switch !== undefined);
    expect(hasSwitchInput).toBe(true);
  });
});
