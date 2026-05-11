"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

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

  // Listen for system theme changes only when no stored preference exists.
  // This keeps the theme in sync if the user changes their OS theme preference.
  useEffect(() => {
    const stored = localStorage.getItem("sam-theme");
    if (stored) return; // Skip if user has an explicit preference

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange(e: MediaQueryListEvent) {
      const newTheme = e.matches ? "dark" : "light";
      setThemeState(newTheme);
      applyThemeClass(newTheme);
    }

    // Use addEventListener for better browser support
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
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
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
