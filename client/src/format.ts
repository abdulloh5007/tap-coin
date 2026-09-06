export function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0.000000001"
  if (n >= 1) return n.toFixed(6)
  if (n >= 0.0001) return n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")
  const [a, b = ""] = n.toFixed(15).split(".")
  const trimmed = b.replace(/0+$/, "")
  const dec = (trimmed.length < 9 ? b.slice(0, 9) : trimmed).padEnd(9, "0")
  return `${a}.${dec}`
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

export function formatAxisPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0"
  if (n >= 1) return n.toFixed(4)
  if (n >= 0.01) return n.toFixed(6)
  const exp = Math.floor(Math.log10(n))
  const mant = n / 10 ** exp
  return `${mant.toFixed(3)}e${exp}`
}

export function formatCountdown(until: number, now: number): string {
  const ms = Math.max(0, until - now)
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}ч ${m}м`
  return `${m}м`
}
