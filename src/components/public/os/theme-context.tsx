"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type OSTheme = "retro90s" | "dark" | "tokyo" | "vscode";

interface ThemeContextType {
  theme: OSTheme;
  setTheme: (theme: OSTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "retro90s",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<OSTheme>("retro90s");

  // Keep Tailwind's class-based `dark:` variant + browser color-scheme in sync
  // with the APP theme (dark/tokyo/vscode are dark surfaces).
  const syncDarkClass = (t: OSTheme) => {
    const isDark = t !== "retro90s";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  };

  // Tema dibaca SETELAH mount (initializer → hydration mismatch). Tulisan ke
  // DOM (data-theme/class dark) memang tugas effect; tapi setState pasca-baca
  // ini ditegur rule. Solusi idiomatik: external store + custom change event
  // (setTheme menulis localStorage di tab yang sama — 'storage' event tidak
  // memicu re-render); migrasi utang terpisah.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sigit-os-theme") as OSTheme | null;
      if (saved && ["retro90s", "dark", "tokyo", "vscode"].includes(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setThemeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
        syncDarkClass(saved);
      } else {
        document.documentElement.setAttribute("data-theme", "retro90s");
        syncDarkClass("retro90s");
      }
    } catch {
      // Storage diblokir (private mode/kebijakan) — tetap pakai tema default
      document.documentElement.setAttribute("data-theme", "retro90s");
      syncDarkClass("retro90s");
    }
  }, []);

  const setTheme = (newTheme: OSTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("sigit-os-theme", newTheme);
    } catch {
      // Storage diblokir — tema tetap berubah untuk sesi ini
    }
    document.documentElement.setAttribute("data-theme", newTheme);
    syncDarkClass(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useOSTheme() {
  return useContext(ThemeContext);
}
