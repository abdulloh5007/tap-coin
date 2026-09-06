import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { alignPriceStrings, formatPriceFixed } from "./ticker.ts"

describe("alignPriceStrings", () => {
  it("keeps the decimal point in the same column", () => {
    const [a, b] = alignPriceStrings("0.001", "0.0012")
    assert.equal(a.indexOf("."), b.indexOf("."))
    assert.equal(a.length, b.length)
    assert.equal(a[0], "0")
    assert.equal(b.endsWith("2"), true)
  })

  it("pads integer width", () => {
    const [a, b] = alignPriceStrings("9.5", "12.5")
    assert.equal(a.indexOf("."), b.indexOf("."))
    assert.equal(a.length, b.length)
  })
})

describe("formatPriceFixed", () => {
  it("keeps a stable tiny-price width", () => {
    const a = formatPriceFixed(1e-9)
    const b = formatPriceFixed(1.000133e-9)
    assert.equal(a.length, b.length)
    assert.equal(a.slice(0, 11), b.slice(0, 11))
  })
})
