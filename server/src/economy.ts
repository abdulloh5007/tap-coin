export const START_PRICE = 0.000000001
export const TICK_MS = 250
export const MAX_TAPS_PER_TICK = 10
export const HISTORY_SECONDS = 300

export type SessionId = "peak" | "normal" | "low"

export type Session = {
  id: SessionId
  mul: number
  label: string
  until: number
}

const WINDOWS: { id: SessionId; startHour: number; mul: number; label: string }[] = [
  { id: "low", startHour: 0, mul: 0.5, label: "затишье" },
  { id: "normal", startHour: 8, mul: 1, label: "норма" },
  { id: "peak", startHour: 16, mul: 1.75, label: "пик" },
]

export function sessionAt(now: Date = new Date()): Session {
  const hour = now.getUTCHours()
  const current =
    [...WINDOWS].reverse().find((w) => hour >= w.startHour) ?? WINDOWS[0]
  const idx = WINDOWS.findIndex((w) => w.id === current.id)
  const next = WINDOWS[(idx + 1) % WINDOWS.length]
  const until = nextUtcHour(now, next.startHour)
  return { id: current.id, mul: current.mul, label: current.label, until }
}

function nextUtcHour(now: Date, hour: number): number {
  const d = new Date(now)
  d.setUTCMinutes(0, 0, 0)
  d.setUTCHours(hour)
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 1)
  return d.getTime()
}

/** Чем больше людей тапают в этот тик, тем меньше бензина за тап. */
export function gasolinePerTap(activeUsers: number, sessionMul: number): number {
  if (activeUsers <= 0) return 0
  return (1 / Math.sqrt(activeUsers)) * sessionMul
}

const GROWTH_K = 0.00012
const DECAY = 0.00001

/** Цена растёт от числа тапающих. Если тапов нет — медленно падает к START_PRICE. */
export function nextPrice(
  price: number,
  totalTaps: number,
  activeUsers: number,
): number {
  const p = Number.isFinite(price) && price > 0 ? price : START_PRICE
  if (totalTaps <= 0 || activeUsers <= 0) {
    return Math.max(START_PRICE, p * (1 - DECAY))
  }
  const demand = Math.log1p(activeUsers)
  const intensity = Math.log1p(totalTaps / activeUsers)
  const growth = GROWTH_K * demand * (1 + 0.25 * intensity)
  return p * (1 + growth)
}

export function clampTaps(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(MAX_TAPS_PER_TICK, Math.floor(n))
}
