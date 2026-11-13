export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "spendly.theme";

export function readTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private browsing */
  }
  return "light";
}

export function applyTheme(mode: ThemeMode): void {
  const dark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", dark ? "#14161C" : "#FAF7F0");
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private browsing */
  }
}
