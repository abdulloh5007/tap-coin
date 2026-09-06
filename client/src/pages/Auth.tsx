import { useState, type FormEvent } from "react"
import { auth, setToken } from "../api.ts"

type Props = { onAuthed: (token: string) => void }

export function Auth({ onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      const res = await auth(mode, username, password)
      setToken(res.token)
      onAuthed(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div>
        <div className="brand">Tap Coin</div>
        <h1>{mode === "login" ? "Вход" : "Регистрация"}</h1>
        <p className="lead">
          Цена растёт, пока люди тапают. Тап — бензин. Чем больше тапают сейчас, тем меньше бензина за нажатие.
        </p>
      </div>
      <form onSubmit={submit}>
        <div>
          <label>
            Логин
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
          </label>
        </div>
        <div>
          <label>
            Пароль
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
        </div>
        <div className="error">{error}</div>
        <button type="submit" disabled={busy}>
          {busy ? "…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login")
            setError("")
          }}
        >
          {mode === "login" ? "Нет аккаунта — регистрация" : "Уже есть аккаунт — вход"}
        </button>
      </form>
    </div>
  )
}
