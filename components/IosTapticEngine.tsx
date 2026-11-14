'use client';

import { useEffect, useRef, useState } from 'react';

export function IosTapticEngine() {
  const [enabled, setEnabled] = useState(true);
  const labelRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    const syncSetting = () => {
      const saved = localStorage.getItem('doomchess_haptics') ?? localStorage.getItem('chess_reel_haptics');
      setEnabled(saved !== null ? (saved === 'true' || saved === '1') : true);
    };
    syncSetting();
    window.addEventListener('doomchess-haptics-changed', syncSetting);

    // Move the invisible 44x44 native switch label directly under the user's finger on touchstart
    // so when the tap completes (click), iOS Safari natively toggles the <input switch> with isTrusted = true!
    const handleTouchStart = (e: TouchEvent) => {
      if (!labelRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Trigger on buttons, interactive controls, and chessboard squares
      const isInteractive =
        target.closest('button, a, [role="button"], [data-square], .chessboard-wrapper');

      if (isInteractive) {
        labelRef.current.style.transform = `translate3d(${touch.clientX - 22}px, ${touch.clientY - 22}px, 0)`;
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    return () => {
      window.removeEventListener('doomchess-haptics-changed', syncSetting);
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '1px',
        height: '1px',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    >
      <input
        id="doomchess-taptic-switch"
        type="checkbox"
        // @ts-expect-error Safari native switch attribute triggers hardware Taptic Engine
        switch=""
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          width: '20px',
          height: '20px',
          opacity: 0.001,
          pointerEvents: 'none',
          margin: 0,
        }}
      />
      <label
        ref={labelRef}
        id="doomchess-taptic-label"
        htmlFor="doomchess-taptic-switch"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '44px',
          height: '44px',
          opacity: 0.001,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

