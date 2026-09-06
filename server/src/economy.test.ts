import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  START_PRICE,
  clampTaps,
  gasolinePerTap,
  nextPrice,
  sessionAt,
} from "./economy.ts"

describe("gasolinePerTap", () => {
  it("is zero when nobody taps", () => {
    assert.equal(gasolinePerTap(0, 1), 0)
  })

  it("falls as more people tap at once", () => {
    const one = gasolinePerTap(1, 1)
    const ten = gasolinePerTap(10, 1)
    const hundred = gasolinePerTap(100, 1)
    assert.ok(one > ten)
    assert.ok(ten > hundred)
    assert.equal(one, 1)
  })

  it("applies session multiplier", () => {
    assert.equal(gasolinePerTap(1, 1.75), 1.75)
    assert.equal(gasolinePerTap(1, 0.5), 0.5)
  })
})

describe("nextPrice", () => {
  it("never goes below the floor", () => {
    assert.equal(nextPrice(START_PRICE, 0, 0), START_PRICE)
  })

  it("decays when idle", () => {
    const p = nextPrice(0.001, 0, 0)
    assert.ok(p < 0.001)
    assert.ok(p > START_PRICE)
  })

  it("grows more when more people tap", () => {
    const one = nextPrice(0.001, 10, 1)
    const many = nextPrice(0.001, 10, 10)
    assert.ok(many > one)
    assert.ok(one > 0.001)
  })
})

describe("sessionAt", () => {
  it("returns peak in the afternoon UTC", () => {
    const s = sessionAt(new Date("2026-09-06T17:00:00Z"))
    assert.equal(s.id, "peak")
    assert.equal(s.mul, 1.75)
  })

  it("returns low at night UTC", () => {
    const s = sessionAt(new Date("2026-09-06T02:00:00Z"))
    assert.equal(s.id, "low")
  })

  it("returns normal in the morning UTC", () => {
    const s = sessionAt(new Date("2026-09-06T10:00:00Z"))
    assert.equal(s.id, "normal")
  })
})

describe("clampTaps", () => {
  it("caps and floors", () => {
    assert.equal(clampTaps(100), 10)
    assert.equal(clampTaps(3.9), 3)
    assert.equal(clampTaps(-1), 0)
  })
})
