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

  useEffect(() => {
    const saved = localStorage.getItem("sigit-os-theme") as OSTheme | null;
    if (saved && ["retro90s", "dark", "tokyo", "vscode"].includes(saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "retro90s");
    }
  }, []);

  const setTheme = (newTheme: OSTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("sigit-os-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
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
