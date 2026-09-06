import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  applyTheme,
  loadSettings,
  resolveColors,
  resolveTheme,
  saveSettings,
  type ChartColors,
  type ChartType,
  type Settings,
  type ThemeMode,
} from "./settings.ts"

type Ctx = {
  settings: Settings
  theme: "dark" | "light"
  colors: ChartColors
  setTheme: (theme: ThemeMode) => void
  setChartType: (chartType: ChartType) => void
  setColors: (colors: ChartColors | null) => void
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(prefers-color-scheme: dark)").matches,
  )

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const theme = settings.theme === "system" ? (systemDark ? "dark" : "light") : resolveTheme(settings.theme)
  const colors = useMemo(() => resolveColors(settings, theme), [settings, theme])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const value = useMemo<Ctx>(
    () => ({
      settings,
      theme,
      colors,
      setTheme: (mode) => setSettings((s) => ({ ...s, theme: mode })),
      setChartType: (chartType) => setSettings((s) => ({ ...s, chartType })),
      setColors: (next) => setSettings((s) => ({ ...s, colors: next })),
    }),
    [settings, theme, colors],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("SettingsProvider required")
  return ctx
}
