"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "light",
  setTheme: () => {},
});

function readInitialTheme(): Theme {
  // Guard for SSR — window is not available on the server.
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("sam-theme") as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer runs once on the client, reading storage/matchMedia directly.
  // Avoids calling setState inside useEffect, which would cause cascading renders.
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Apply the CSS class for any stored preference on mount.
  // The flash-prevention script in layout.tsx already does this before React
  // loads; this effect keeps the class correct after hydration.
  useEffect(() => {
    const stored = localStorage.getItem("sam-theme") as Theme | null;
    if (stored === "dark" || stored === "light") {
      applyThemeClass(stored);
    }
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem("sam-theme", next);
    applyThemeClass(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyThemeClass(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  html.classList.add(theme);
}

export function useTheme() {
  return useContext(ThemeContext);
}
