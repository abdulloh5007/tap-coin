import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"
import { PriceChart } from "../components/PriceChart.tsx"
import {
  getToken,
  setToken,
  wsUrl,
  type Snapshot,
  type Tick,
} from "../api.ts"
import { formatCountdown, formatGas, formatInt, formatPrice } from "../format.ts"

type Point = { ts: number; price: number }
type Pulse = { id: number; x: number; y: number }
type Floater = { id: number; text: string }

export function Main({ onLogout }: { onLogout: () => void }) {
  const [snap, setSnap] = useState<Pick<
    Snapshot,
    "price" | "activeUsers" | "online" | "gasolinePerTap" | "session" | "me"
  > | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [now, setNow] = useState(Date.now())
  const [hit, setHit] = useState(false)
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [floaters, setFloaters] = useState<Floater[]>([])
  const pending = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)
  const gasRef = useRef(1)
  const idRef = useRef(0)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      const ws = new WebSocket(wsUrl())
      wsRef.current = ws
      ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }))
      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as Snapshot | Tick
        if (msg.type === "snapshot") {
          gasRef.current = msg.gasolinePerTap
          setSnap(msg)
          setPoints(msg.history.length ? msg.history : [{ ts: msg.ts, price: msg.price }])
        }
        if (msg.type === "tick") {
          gasRef.current = msg.gasolinePerTap
          setSnap({
            price: msg.price,
            activeUsers: msg.activeUsers,
            online: msg.online,
            gasolinePerTap: msg.gasolinePerTap,
            session: msg.session,
            me: msg.me,
          })
          setPoints((prev) => {
            const next = [...prev, { ts: msg.ts, price: msg.price }]
            const cut = msg.ts - 5 * 60 * 1000
            return next.filter((p) => p.ts >= cut).slice(-1200)
          })
        }
      }
      ws.onclose = () => {
        wsRef.current = null
        if (!stopped) retry = setTimeout(connect, 800)
      }
    }

    connect()
    const flush = setInterval(() => {
      const n = pending.current
      if (n <= 0) return
      pending.current = 0
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "taps", n }))
      }
    }, 50)

    return () => {
      stopped = true
      clearInterval(flush)
      if (retry) clearTimeout(retry)
      wsRef.current?.close()
    }
  }, [])

  const tap = useCallback((e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    pending.current += 1
    const id = ++idRef.current
    setHit(true)
    window.setTimeout(() => setHit(false), 80)
    setPulses((p) => [...p.slice(-12), { id, x: e.clientX, y: e.clientY }])
    setFloaters((f) => [...f.slice(-8), { id, text: `+${formatGas(gasRef.current)}` }])
    window.setTimeout(() => {
      setPulses((p) => p.filter((x) => x.id !== id))
      setFloaters((f) => f.filter((x) => x.id !== id))
    }, 700)
  }, [])

  function logout() {
    setToken(null)
    onLogout()
  }

  if (!snap) {
    return (
      <div className="auth">
        <div className="brand">Tap Coin</div>
        <p className="lead">подключение…</p>
      </div>
    )
  }

  return (
    <div className={`shell${hit ? " hit" : ""}`} onPointerDown={tap}>
      <header className="top">
        <span>Tap Coin</span>
        <button type="button" onClick={logout}>
          выход
        </button>
      </header>

      <section className="price-block">
        <div className="label">Цена</div>
        <div className="price num">{formatPrice(snap.price)}</div>
        <div className="meta">
          <span>
            тапают <b className="num">{formatInt(snap.activeUsers)}</b>
          </span>
          <span>
            онлайн <b className="num">{formatInt(snap.online)}</b>
          </span>
          <span>
            бензин/тап <b className="num">{formatGas(snap.gasolinePerTap)}</b>
          </span>
          <span>
            окно <b>{snap.session.label}</b> ×{snap.session.mul} · ещё{" "}
            {formatCountdown(snap.session.until, now)}
          </span>
        </div>
      </section>

      <div className="chart-wrap">
        <PriceChart points={points} />
      </div>

      <div className="tap-zone">
        <div className="hint">нажмите на экран</div>
        {pulses.map((p) => (
          <span key={p.id} className="pulse" style={{ left: p.x, top: p.y }} />
        ))}
        {floaters.map((f) => (
          <span key={f.id} className="floater num">
            {f.text}
          </span>
        ))}
      </div>

      <footer className="bottom">
        <div>
          мои тапы
          <b className="num">{formatInt(snap.me.taps)}</b>
        </div>
        <div>
          бензин
          <b className="num">{formatGas(snap.me.gasoline)}</b>
        </div>
      </footer>
    </div>
  )
}
