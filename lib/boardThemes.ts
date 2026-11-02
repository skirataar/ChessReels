"use client";

import { useState, useEffect, useCallback } from "react";

export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "walnut", name: "Walnut Wood", light: "#edd6b0", dark: "#b88762" },
  { id: "tournament", name: "Tournament Green", light: "#eeeed2", dark: "#769656" },
  { id: "obsidian", name: "Obsidian Charcoal", light: "#26221f", dark: "#161311" },
  { id: "icy-sea", name: "Icy Sea", light: "#dee3e6", dark: "#7896a4" },
  { id: "coral", name: "Coral Stone", light: "#f7e6d4", dark: "#d18b72" },
  { id: "midnight", name: "Midnight Navy", light: "#e2e8f0", dark: "#334155" },
];

export const DEFAULT_BOARD_THEME = BOARD_THEMES[0]; // Walnut Wood default

export function getStoredBoardTheme(): BoardTheme {
  if (typeof window === "undefined") return DEFAULT_BOARD_THEME;
  try {
    const savedId = window.localStorage.getItem("chess_reel_board_theme");
    if (!savedId) return DEFAULT_BOARD_THEME;
    const found = BOARD_THEMES.find((t) => t.id === savedId);
    return found || DEFAULT_BOARD_THEME;
  } catch {
    return DEFAULT_BOARD_THEME;
  }
}

export function setStoredBoardTheme(themeId: string): BoardTheme {
  const theme = BOARD_THEMES.find((t) => t.id === themeId) || DEFAULT_BOARD_THEME;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("chess_reel_board_theme", theme.id);
      window.dispatchEvent(
        new CustomEvent("board-theme-updated", { detail: { themeId: theme.id, theme } })
      );
    } catch {}
  }
  return theme;
}

export function useBoardTheme(): [BoardTheme, (themeId: string) => void] {
  const [theme, setTheme] = useState<BoardTheme>(() => getStoredBoardTheme());

  useEffect(() => {
    // Initial sync from localStorage
    setTheme(getStoredBoardTheme());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ themeId?: string; theme?: BoardTheme }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else if (customEvent.detail?.themeId) {
        const found = BOARD_THEMES.find((t) => t.id === customEvent.detail.themeId);
        if (found) setTheme(found);
      } else {
        setTheme(getStoredBoardTheme());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "chess_reel_board_theme") {
        setTheme(getStoredBoardTheme());
      }
    };

    window.addEventListener("board-theme-updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("board-theme-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const changeTheme = useCallback((themeId: string) => {
    const updated = setStoredBoardTheme(themeId);
    setTheme(updated);
  }, []);

  return [theme, changeTheme];
}
