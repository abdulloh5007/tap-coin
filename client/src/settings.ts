export type ThemeMode = "dark" | "light" | "system"
export type ChartType = "line" | "bar"

export type ChartColors = {
  line: string
  up: string
  down: string
}

export type Settings = {
  theme: ThemeMode
  chartType: ChartType
  colors: ChartColors | null
}

export const KEY = "tap-coin-settings"

export const DARK_COLORS: ChartColors = {
  line: "#e6e6e6",
  up: "#26a69a",
  down: "#ef5350",
}

export const LIGHT_COLORS: ChartColors = {
  line: "#1a1a1a",
  up: "#089981",
  down: "#f23645",
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  chartType: "line",
  colors: null,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    const theme: ThemeMode =
      parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system"
        ? parsed.theme
        : "system"
    const chartType: ChartType = parsed.chartType === "bar" ? "bar" : "line"
    const colors =
      parsed.colors &&
      typeof parsed.colors.line === "string" &&
      typeof parsed.colors.up === "string" &&
      typeof parsed.colors.down === "string"
        ? parsed.colors
        : null
    return { theme, chartType, colors }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true
}

export function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light"
  return mode
}

export function resolveColors(s: Settings, theme: "dark" | "light"): ChartColors {
  if (s.colors) return s.colors
  return theme === "light" ? LIGHT_COLORS : DARK_COLORS
}

export function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
