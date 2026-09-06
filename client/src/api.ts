export type Session = {
  id: "peak" | "normal" | "low"
  mul: number
  label: string
  until: number
}

export type Me = { taps: number; gasoline: number }

export type Tick = {
  type: "tick"
  ts: number
  price: number
  activeUsers: number
  online: number
  tapsTick: number
  gasolinePerTap: number
  session: Session
  me: Me
}

export type Snapshot = {
  type: "snapshot"
  ts: number
  price: number
  activeUsers: number
  online: number
  gasolinePerTap: number
  session: Session
  history: { ts: number; price: number }[]
  totals: { taps: number; gasoline: number }
  me: Me
}

const TOKEN_KEY = "tap-coin-token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || "Ошибка запроса")
  return data
}

export function auth(mode: "login" | "register", username: string, password: string) {
  return request<{ token: string; user: { username: string } }>(`/api/${mode}`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:"
  return `${proto}//${location.host}/ws`
}
