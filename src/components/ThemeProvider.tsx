"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { DEFAULT_THEME, isThemeId, ThemeId, THEMES } from "@/lib/themes";

const STORAGE_KEY = "jata-theme";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: typeof THEMES;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
}

function readStoredTheme(): ThemeId | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeId(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: ThemeId;
}) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return initialTheme ?? DEFAULT_THEME;
    return readStoredTheme() ?? initialTheme ?? DEFAULT_THEME;
  });

  // Keep DOM attribute in sync whenever React theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // After hydration, restore client preference (SSR state is always default)
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) setThemeState(stored);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, themes: THEMES }),
    [theme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeSync />
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeSync() {
  const { status } = useSession();
  const { setTheme } = useTheme();
  const syncedForSession = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      syncedForSession.current = false;
      return;
    }
    if (syncedForSession.current) return;
    syncedForSession.current = true;

    // Prefer an explicit account theme. If none is saved, keep localStorage/client choice.
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.theme && isThemeId(d.theme)) {
          setTheme(d.theme);
        }
      })
      .catch(() => {});
  }, [status, setTheme]);

  return null;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
