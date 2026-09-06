export type Point = { ts: number; price: number }

export type Bar = {
  ts: number
  open: number
  high: number
  low: number
  close: number
}

export function bucketMsForSpan(spanMs: number): number {
  const raw = spanMs / 48
  const steps = [250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000]
  return steps.find((s) => s >= raw) ?? 60000
}

export function toBars(points: Point[], bucketMs: number): Bar[] {
  if (points.length === 0) return []
  const bars: Bar[] = []
  let cur: Bar | null = null
  for (const p of points) {
    const t = Math.floor(p.ts / bucketMs) * bucketMs
    if (!cur || cur.ts !== t) {
      if (cur) bars.push(cur)
      cur = { ts: t, open: p.price, high: p.price, low: p.price, close: p.price }
    } else {
      cur.high = Math.max(cur.high, p.price)
      cur.low = Math.min(cur.low, p.price)
      cur.close = p.price
    }
  }
  if (cur) bars.push(cur)
  return bars
}

export function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const p = Number.isFinite(min) ? min : 0
    return [p]
  }
  if (min > max) [min, max] = [max, min]
  const range = niceNum(max - min, false)
  const step = niceNum(range / Math.max(2, count), true)
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step / 2; v += step) {
    ticks.push(v)
    if (ticks.length > 12) break
  }
  return ticks.length ? ticks : [min, max]
}

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(Math.max(range, Number.MIN_VALUE)))
  const frac = range / 10 ** exp
  let nice: number
  if (round) {
    if (frac < 1.5) nice = 1
    else if (frac < 3) nice = 2
    else if (frac < 7) nice = 5
    else nice = 10
  } else if (frac <= 1) nice = 1
  else if (frac <= 2) nice = 2
  else if (frac <= 5) nice = 5
  else nice = 10
  return nice * 10 ** exp
}
