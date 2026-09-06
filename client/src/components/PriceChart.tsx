import { useEffect, useRef, useState } from "react"
import { bucketMsForSpan, niceTicks, toBars, type Point } from "../chart/math.ts"
import { formatAxisPrice } from "../format.ts"
import type { ChartColors, ChartType } from "../settings.ts"

type Props = {
  points: Point[]
  type: ChartType
  colors: ChartColors
  theme: "dark" | "light"
}

const AXIS_W = 78
const PAD_Y = 12
const MIN_SPAN = 20_000
const DEF_SPAN = 120_000

export function PriceChart({ points, type, colors, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const pointsRef = useRef(points)
  const typeRef = useRef(type)
  const colorsRef = useRef(colors)
  const themeRef = useRef(theme)
  const view = useRef({ offset: 0, span: DEF_SPAN })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; span: number } | null>(null)
  const dragging = useRef(false)
  const liveRef = useRef(true)
  const [live, setLive] = useState(true)
  const drawRef = useRef<() => void>(() => {})

  pointsRef.current = points
  typeRef.current = type
  colorsRef.current = colors
  themeRef.current = theme

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = wrapRef.current
    if (!canvas || !parent) return

    const draw = () => {
      const pts = pointsRef.current
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (w < 8 || h < 8) return
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const hair = themeRef.current === "light" ? "#d8d8d4" : "#2a2a2a"
      const muted = themeRef.current === "light" ? "#8a8a8a" : "#7d7d7d"
      const fg = themeRef.current === "light" ? "#111111" : "#f3f3f3"
      const pal = colorsRef.current
      const plotW = Math.max(8, w - AXIS_W)
      const plotH = h - PAD_Y * 2

      ctx.strokeStyle = hair
      ctx.beginPath()
      ctx.moveTo(plotW + 0.5, 0)
      ctx.lineTo(plotW + 0.5, h)
      ctx.stroke()

      if (pts.length < 2) {
        ctx.fillStyle = muted
        ctx.font = "11px IBM Plex Sans, sans-serif"
        ctx.fillText("нет данных", 12, h / 2)
        return
      }

      const lastTs = pts[pts.length - 1].ts
      const firstTs = pts[0].ts
      const maxOffset = Math.max(0, lastTs - firstTs - view.current.span)
      view.current.offset = Math.min(Math.max(0, view.current.offset), maxOffset)
      const end = lastTs - view.current.offset
      const start = end - view.current.span

      const visible = pts.filter((p) => p.ts >= start && p.ts <= end)
      const series = visible.length ? visible : pts.slice(-2)
      let min = Math.min(...series.map((p) => p.price))
      let max = Math.max(...series.map((p) => p.price))
      if (typeRef.current === "bar") {
        const bars = toBars(series, bucketMsForSpan(view.current.span))
        if (bars.length) {
          min = Math.min(...bars.map((b) => b.low))
          max = Math.max(...bars.map((b) => b.high))
        }
      }
      if (min === max) {
        const pad = Math.abs(min) * 0.001 || 1e-12
        min -= pad
        max += pad
      } else {
        const extra = (max - min) * 0.08
        min -= extra
        max += extra
      }

      const yAt = (price: number) => PAD_Y + (1 - (price - min) / (max - min)) * plotH
      const xAt = (ts: number) => ((ts - start) / Math.max(1, end - start)) * plotW

      const ticks = niceTicks(min, max, 5)
      ctx.font = "10px IBM Plex Mono, ui-monospace, monospace"
      ctx.textBaseline = "middle"
      ctx.lineWidth = 1
      for (let i = 0; i < ticks.length; i++) {
        const tick = ticks[i]
        const y = yAt(tick)
        if (y < 8 || y > h - 8) continue
        ctx.strokeStyle = hair
        ctx.setLineDash([2, 5])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(plotW, y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(plotW, y)
        ctx.lineTo(plotW + 8, y)
        ctx.stroke()
        ctx.fillStyle = muted
        ctx.textAlign = "left"
        ctx.fillText(formatAxisPrice(tick), plotW + 12, y)
        if (i < ticks.length - 1) {
          const next = ticks[i + 1]
          for (let k = 1; k <= 4; k++) {
            const my = yAt(tick + ((next - tick) * k) / 5)
            if (my < 8 || my > h - 8) continue
            ctx.strokeStyle = hair
            ctx.beginPath()
            ctx.moveTo(plotW, my)
            ctx.lineTo(plotW + 4, my)
            ctx.stroke()
          }
        }
      }

      if (typeRef.current === "bar") {
        const bucket = bucketMsForSpan(view.current.span)
        const bars = toBars(
          pts.filter((p) => p.ts >= start - bucket && p.ts <= end),
          bucket,
        )
        const bw = Math.max(5, Math.min(18, (plotW / Math.max(2, bars.length)) * 0.7))
        for (const bar of bars) {
          const x = xAt(bar.ts + bucket / 2)
          if (x < -bw || x > plotW + bw) continue
          const up = bar.close >= bar.open
          ctx.strokeStyle = up ? pal.up : pal.down
          ctx.lineWidth = 1.5
          let yH = yAt(bar.high)
          let yL = yAt(bar.low)
          const yO = yAt(bar.open)
          const yC = yAt(bar.close)
          if (Math.abs(yL - yH) < 6) {
            const mid = (yH + yL) / 2
            yH = mid - 3
            yL = mid + 3
          }
          ctx.beginPath()
          ctx.moveTo(x, yH)
          ctx.lineTo(x, yL)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x - bw / 2, yO)
          ctx.lineTo(x, yO)
          ctx.moveTo(x, yC)
          ctx.lineTo(x + bw / 2, yC)
          ctx.stroke()
        }
      } else {
        ctx.beginPath()
        series.forEach((p, i) => {
          const x = xAt(p.ts)
          const y = yAt(p.price)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = pal.line
        ctx.lineWidth = 1.25
        ctx.stroke()
        const last = series[series.length - 1]
        ctx.lineTo(xAt(last.ts), h)
        ctx.lineTo(xAt(series[0].ts), h)
        ctx.closePath()
        ctx.fillStyle = pal.line + "14"
        ctx.fill()
      }

      const last = pts[pts.length - 1]
      const lastY = yAt(last.price)
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = pal.line
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.moveTo(0, lastY)
      ctx.lineTo(plotW, lastY)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.setLineDash([])

      const label = formatAxisPrice(last.price)
      ctx.font = "10px IBM Plex Mono, ui-monospace, monospace"
      const tw = ctx.measureText(label).width
      const bx = plotW + 4
      const by = Math.min(h - 16, Math.max(4, lastY - 8))
      ctx.fillStyle = pal.line
      roundRect(ctx, bx, by, tw + 10, 16, 2)
      ctx.fill()
      ctx.fillStyle = themeRef.current === "light" ? "#fff" : "#111"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(label, bx + 5, by + 8)

      ctx.fillStyle = fg
      ctx.fillRect(plotW, lastY - 0.5, 6, 1)
    }

    drawRef.current = draw
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    drawRef.current()
  }, [points, type, colors, theme, live])

  function goLive() {
    view.current.offset = 0
    liveRef.current = true
    setLive(true)
    drawRef.current()
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const maxSpan = () => {
      const pts = pointsRef.current
      if (pts.length < 2) return DEF_SPAN
      return Math.max(MIN_SPAN, pts[pts.length - 1].ts - pts[0].ts)
    }

    const clamp = () => {
      const pts = pointsRef.current
      if (pts.length < 2) return
      const lastTs = pts[pts.length - 1].ts
      const firstTs = pts[0].ts
      view.current.span = Math.min(Math.max(MIN_SPAN, view.current.span), maxSpan())
      const maxOffset = Math.max(0, lastTs - firstTs - view.current.span)
      view.current.offset = Math.min(Math.max(0, view.current.offset), maxOffset)
      const following = view.current.offset < 80
      if (following) view.current.offset = 0
      if (liveRef.current !== following) {
        liveRef.current = following
        setLive(following)
      }
    }

    const onDown = (e: PointerEvent) => {
      e.stopPropagation()
      el.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      dragging.current = true
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        pinch.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          span: view.current.span,
        }
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      const prev = pointers.current.get(e.pointerId)!
      const dx = e.clientX - prev.x
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch.current.dist > 0) {
          view.current.span = pinch.current.span * (pinch.current.dist / dist)
          clamp()
          drawRef.current()
        }
        return
      }

      if (!dragging.current) return
      const plotW = Math.max(8, el.clientWidth - AXIS_W)
      view.current.offset += (dx / plotW) * view.current.span
      clamp()
      drawRef.current()
    }

    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current = null
      if (pointers.current.size === 0) dragging.current = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const pts = pointsRef.current
      if (pts.length < 2) return
      const factor = e.deltaY > 0 ? 1.12 : 0.89
      view.current.span *= factor
      clamp()
      drawRef.current()
    }

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
      el.removeEventListener("wheel", onWheel)
    }
  }, [])

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} />
      {!live && (
        <button type="button" className="live-btn" onClick={goLive}>
          live
        </button>
      )}
    </div>
  )
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
