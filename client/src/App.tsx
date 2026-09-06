import { useState } from "react"
import { getToken } from "./api.ts"
import { Auth } from "./pages/Auth.tsx"
import { Main } from "./pages/Main.tsx"
import { Settings } from "./pages/Settings.tsx"
import { SettingsProvider } from "./SettingsContext.tsx"

function Shell() {
  const [token, setAuthed] = useState<string | null>(() => getToken())
  const [page, setPage] = useState<"main" | "settings">("main")

  if (!token) {
    return (
      <Auth
        onAuthed={(t) => {
          setAuthed(t)
          setPage("main")
        }}
      />
    )
  }

  if (page === "settings") {
    return (
      <Settings
        onBack={() => setPage("main")}
      />
    )
  }

  return (
    <Main onLogout={() => setAuthed(null)} onSettings={() => setPage("settings")} />
  )
}

export function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  )
}
