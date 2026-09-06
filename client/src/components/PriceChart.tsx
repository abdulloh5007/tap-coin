import { useEffect, useRef } from "react"

type Point = { ts: number; price: number }

export function PriceChart({ points }: { points: Point[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      if (points.length < 2) {
        ctx.strokeStyle = "#2a2a2a"
        ctx.beginPath()
        ctx.moveTo(16, h / 2)
        ctx.lineTo(w - 16, h / 2)
        ctx.stroke()
        return
      }

      const prices = points.map((p) => p.price)
      let min = Math.min(...prices)
      let max = Math.max(...prices)
      if (min === max) {
        min *= 0.999
        max *= 1.001
      }
      const pad = 12
      const innerH = h - pad * 2
      const innerW = w - 8
      const t0 = points[0].ts
      const t1 = points[points.length - 1].ts
      const span = Math.max(1, t1 - t0)

      const xy = (p: Point) => {
        const x = 4 + ((p.ts - t0) / span) * innerW
        const y = pad + (1 - (p.price - min) / (max - min)) * innerH
        return { x, y }
      }

      ctx.beginPath()
      points.forEach((p, i) => {
        const { x, y } = xy(p)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = "#f3f3f3"
      ctx.lineWidth = 1.25
      ctx.stroke()

      const last = xy(points[points.length - 1])
      ctx.lineTo(last.x, h)
      ctx.lineTo(4, h)
      ctx.closePath()
      ctx.fillStyle = "rgba(243,243,243,0.05)"
      ctx.fill()
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [points])

  return <canvas ref={canvasRef} />
}
