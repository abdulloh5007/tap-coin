import { type ChartType, type ThemeMode } from "../settings.ts"
import { useSettings } from "../SettingsContext.tsx"

export function Settings({ onBack }: { onBack: () => void }) {
  const { settings, theme, colors, setTheme, setChartType, setColors } = useSettings()

  return (
    <div className="page">
      <header className="top">
        <button type="button" onClick={onBack}>
          назад
        </button>
        <span>Настройки</span>
        <span className="top-spacer" />
      </header>

      <section className="settings">
        <h2>Тема</h2>
        <div className="seg">
          {(["dark", "light", "system"] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={settings.theme === mode ? "on" : ""}
              onClick={() => setTheme(mode)}
            >
              {mode === "dark" ? "тёмная" : mode === "light" ? "светлая" : "системная"}
            </button>
          ))}
        </div>

        <h2>Тип графика</h2>
        <div className="seg">
          {(["line", "bar"] as ChartType[]).map((kind) => (
            <button
              key={kind}
              type="button"
              className={settings.chartType === kind ? "on" : ""}
              onClick={() => setChartType(kind)}
            >
              {kind === "line" ? "линия" : "бары"}
            </button>
          ))}
        </div>

        <h2>Цвета</h2>
        <label className="color-row">
          линия
          <input
            type="color"
            value={colors.line}
            onChange={(e) => setColors({ ...colors, line: e.target.value })}
          />
        </label>
        <label className="color-row">
          рост
          <input
            type="color"
            value={colors.up}
            onChange={(e) => setColors({ ...colors, up: e.target.value })}
          />
        </label>
        <label className="color-row">
          падение
          <input
            type="color"
            value={colors.down}
            onChange={(e) => setColors({ ...colors, down: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="ghost"
          onClick={() => setColors(null)}
        >
          сбросить цвета ({theme === "light" ? "светлая" : "тёмная"} тема)
        </button>
        <p className="hint-text">
          Свайп по графику листает историю, щипок или колесо меняют масштаб. Бары как в TradingView: open слева, close справа.
        </p>
      </section>
    </div>
  )
}
