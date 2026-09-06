import { useState } from "react"
import { getToken } from "./api.ts"
import { Auth } from "./pages/Auth.tsx"
import { Main } from "./pages/Main.tsx"

export function App() {
  const [token, setAuthed] = useState<string | null>(() => getToken())

  if (!token) return <Auth onAuthed={setAuthed} />
  return <Main onLogout={() => setAuthed(null)} />
}
