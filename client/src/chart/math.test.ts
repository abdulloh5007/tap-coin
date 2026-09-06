import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { bucketMsForSpan, niceTicks, toBars } from "./math.ts"

describe("toBars", () => {
  it("aggregates ticks into OHLC", () => {
    const bars = toBars(
      [
        { ts: 1000, price: 1 },
        { ts: 1100, price: 3 },
        { ts: 1200, price: 2 },
        { ts: 2000, price: 4 },
      ],
      1000,
    )
    assert.equal(bars.length, 2)
    assert.equal(bars[0].open, 1)
    assert.equal(bars[0].high, 3)
    assert.equal(bars[0].low, 1)
    assert.equal(bars[0].close, 2)
    assert.equal(bars[1].open, 4)
    assert.equal(bars[1].close, 4)
  })
})

describe("niceTicks", () => {
  it("returns ticks inside the range", () => {
    const ticks = niceTicks(0.1, 0.5, 4)
    assert.ok(ticks.length >= 2)
    assert.ok(ticks[0] >= 0.1 - 1e-9)
    assert.ok(ticks[ticks.length - 1] <= 0.5 + 0.1)
  })
})

describe("bucketMsForSpan", () => {
  it("grows with visible span", () => {
    assert.ok(bucketMsForSpan(30_000) <= bucketMsForSpan(300_000))
  })
})
