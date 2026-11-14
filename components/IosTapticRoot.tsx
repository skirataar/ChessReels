'use client';

import { useEffect, useState } from 'react';

export function IosTapticRoot() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const check = () => {
      const val = localStorage.getItem('doomchess_haptics') ?? localStorage.getItem('chess_reel_haptics');
      setEnabled(val !== null ? (val === 'true' || val === '1') : true);
    };
    check();
    window.addEventListener('doomchess-haptics-changed', check);
    return () => window.removeEventListener('doomchess-haptics-changed', check);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '1px',
        height: '1px',
        opacity: 0.01,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      <input
        type="checkbox"
        id="doomchess-native-taptic-switch"
        // @ts-expect-error iOS Safari native switch attribute
        switch=""
        disabled={!enabled}
        tabIndex={-1}
      />
      <label
        htmlFor="doomchess-native-taptic-switch"
        id="doomchess-native-taptic-label"
        style={{ display: 'block', width: '1px', height: '1px' }}
      />
    </div>
  );
}
