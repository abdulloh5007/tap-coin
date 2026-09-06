import type { WebSocket } from "ws"
import {
  HISTORY_SECONDS,
  TICK_MS,
  clampTaps,
  gasolinePerTap,
  nextPrice,
  sessionAt,
} from "./economy.ts"
import {
  commitTick,
  getPrice,
  getTotals,
  getUserById,
  loadHistory,
  pruneTicks,
  type TickRow,
} from "./db.ts"

export type Client = {
  ws: WebSocket
  userId: number
  alive: boolean
}

type TickMsg = {
  type: "tick"
  ts: number
  price: number
  activeUsers: number
  online: number
  tapsTick: number
  gasolinePerTap: number
  session: ReturnType<typeof sessionAt>
  me: { taps: number; gasoline: number }
}

type SnapshotMsg = {
  type: "snapshot"
  ts: number
  price: number
  activeUsers: number
  online: number
  gasolinePerTap: number
  session: ReturnType<typeof sessionAt>
  history: { ts: number; price: number }[]
  totals: { taps: number; gasoline: number }
  me: { taps: number; gasoline: number }
}

const tapBuffer = new Map<number, number>()
const stats = new Map<number, { taps: number; gasoline: number }>()
const clients = new Set<Client>()

let price = getPrice()
let totals = getTotals()
let lastTick: TickRow | null = null

function loadUserStats(id: number): { taps: number; gasoline: number } {
  const cached = stats.get(id)
  if (cached) return cached
  const row = getUserById(id)
  const s = { taps: row?.taps ?? 0, gasoline: row?.gasoline ?? 0 }
  stats.set(id, s)
  return s
}

export function addClient(client: Client): void {
  clients.add(client)
  loadUserStats(client.userId)
}

export function removeClient(client: Client): void {
  clients.delete(client)
}

export function enqueueTaps(userId: number, n: number): void {
  const add = clampTaps(n)
  if (add <= 0) return
  const current = tapBuffer.get(userId) ?? 0
  tapBuffer.set(userId, clampTaps(current + add))
}

export function snapshotFor(userId: number): SnapshotMsg {
  const session = sessionAt()
  const active = tapBuffer.size
  const me = loadUserStats(userId)
  return {
    type: "snapshot",
    ts: Date.now(),
    price,
    activeUsers: active,
    online: clients.size,
    gasolinePerTap: gasolinePerTap(Math.max(active, 1), session.mul),
    session,
    history: loadHistory(HISTORY_SECONDS).map((t) => ({ ts: t.ts, price: t.price })),
    totals,
    me,
  }
}

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data))
}

function tick(): void {
  const ts = Date.now()
  const session = sessionAt()
  const userDeltas: { id: number; taps: number; gasoline: number }[] = []
  let tapsTick = 0

  for (const [userId, raw] of tapBuffer) {
    const taps = clampTaps(raw)
    if (taps <= 0) continue
    tapsTick += taps
    userDeltas.push({ id: userId, taps, gasoline: 0 })
  }
  tapBuffer.clear()

  const activeUsers = userDeltas.length
  const gas = gasolinePerTap(activeUsers, session.mul)
  const quotedGas = activeUsers > 0 ? gas : gasolinePerTap(1, session.mul)
  price = nextPrice(price, tapsTick, activeUsers)

  let addedGas = 0
  for (const delta of userDeltas) {
    delta.gasoline = delta.taps * gas
    addedGas += delta.gasoline
    const s = loadUserStats(delta.id)
    s.taps += delta.taps
    s.gasoline += delta.gasoline
  }

  totals = {
    taps: totals.taps + tapsTick,
    gasoline: totals.gasoline + addedGas,
  }

  lastTick = {
    ts,
    price,
    taps: tapsTick,
    active: activeUsers,
    gasoline_per_tap: gas,
  }

  commitTick({
    ts,
    price,
    taps: tapsTick,
    active: activeUsers,
    gasolinePerTap: gas,
    totalTaps: totals.taps,
    totalGasoline: totals.gasoline,
    userDeltas,
  })

  const online = clients.size
  for (const client of clients) {
    const me = loadUserStats(client.userId)
    const msg: TickMsg = {
      type: "tick",
      ts,
      price,
      activeUsers,
      online,
      tapsTick,
      gasolinePerTap: quotedGas,
      session,
      me,
    }
    send(client.ws, msg)
  }
}

let timer: ReturnType<typeof setInterval> | null = null
let pruneTimer: ReturnType<typeof setInterval> | null = null

export function startEngine(): void {
  if (timer) return
  timer = setInterval(tick, TICK_MS)
  pruneTimer = setInterval(() => pruneTicks(24 * 60 * 60 * 1000), 5 * 60 * 1000)
}

export function stopEngine(): void {
  if (timer) clearInterval(timer)
  if (pruneTimer) clearInterval(pruneTimer)
  timer = null
  pruneTimer = null
}

export function currentPublicState() {
  const session = sessionAt()
  return {
    price,
    session,
    online: clients.size,
    lastTick,
    totals,
  }
}
