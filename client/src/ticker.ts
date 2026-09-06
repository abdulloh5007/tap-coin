export function formatPriceFixed(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0.000000001000000"
  if (n >= 1) return n.toFixed(6)
  if (n >= 0.0001) return n.toFixed(8)
  return n.toFixed(15)
}

export function alignPriceStrings(a: string, b: string): [string, string] {
  const split = (s: string) => {
    const i = s.indexOf(".")
    if (i < 0) return { int: s, frac: "" }
    return { int: s.slice(0, i), frac: s.slice(i + 1) }
  }
  const A = split(a)
  const B = split(b)
  const intLen = Math.max(A.int.length, B.int.length)
  const fracLen = Math.max(A.frac.length, B.frac.length)
  const pack = (p: { int: string; frac: string }) => {
    const int = p.int.padStart(intLen, " ")
    return fracLen > 0 ? `${int}.${p.frac.padEnd(fracLen, " ")}` : int
  }
  return [pack(A), pack(B)]
}
