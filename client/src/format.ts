export function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0.000000001"
  if (n >= 1) return n.toFixed(6)
  const digits = n >= 0.01 ? 8 : 12
  return n.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")
}

export function formatGas(n: number): string {
  if (!Number.isFinite(n)) return "0"
  if (n >= 100) return n.toFixed(1)
  if (n >= 1) return n.toFixed(3)
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

export function formatInt(n: number): string {
  return Math.floor(n).toLocaleString("ru-RU")
}

export function formatCountdown(until: number, now: number): string {
  const ms = Math.max(0, until - now)
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}ч ${m}м`
  return `${m}м`
}
