import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { applyTheme, loadSettings, resolveTheme } from "./settings.ts"
import "./styles.css"

applyTheme(resolveTheme(loadSettings().theme))

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
