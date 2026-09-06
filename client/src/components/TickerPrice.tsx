import { memo, useLayoutEffect, useRef, useState } from "react"
import { alignPriceStrings, formatPriceFixed } from "../ticker.ts"

type Dir = "up" | "down" | "none"

type Frame = {
  prev: string
  next: string
  dir: Dir
  gen: number
}

export const TickerPrice = memo(function TickerPrice({ value }: { value: number }) {
  const text = formatPriceFixed(value)
  const prevValue = useRef(value)
  const prevText = useRef(text)
  const [frame, setFrame] = useState<Frame>({ prev: text, next: text, dir: "none", gen: 0 })

  useLayoutEffect(() => {
    if (text === prevText.current) return
    const dir: Dir = value > prevValue.current ? "up" : value < prevValue.current ? "down" : "none"
    setFrame((f) => ({ prev: prevText.current, next: text, dir, gen: f.gen + 1 }))
    prevText.current = text
    prevValue.current = value
  }, [value, text])

  const [prevAligned, nextAligned] = alignPriceStrings(frame.prev, frame.next)

  return (
    <span className="ticker" aria-label={frame.next}>
      {nextAligned.split("").map((ch, i) => {
        const prev = prevAligned[i] ?? " "
        if (ch === " " && prev === " ") return null
        if (ch === ".") {
          return (
            <span key={`dot-${i}`} className="tick-char is-dot">
              .
            </span>
          )
        }
        const changed = frame.dir !== "none" && prev !== ch
        if (!changed) {
          return (
            <span key={`s-${i}`} className="tick-char">
              {ch === " " ? "" : ch}
            </span>
          )
        }
        return (
          <span key={`a-${i}-${frame.gen}`} className={`tick-char tick-${frame.dir}`}>
            <span className="tick-out">{prev === " " ? "" : prev}</span>
            <span className="tick-in">{ch === " " ? "" : ch}</span>
          </span>
        )
      })}
    </span>
  )
})
