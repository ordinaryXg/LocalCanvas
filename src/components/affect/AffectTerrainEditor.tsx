import { useCallback, useEffect, useRef, useState } from 'react'
import type { AffectEnvelope } from '../../types/fluid'
import { useProjectStore } from '../../stores/projectStore'
import { fluidBus } from '../../lib/fluidBus'

export function AffectTerrainEditor() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [envelope, setEnvelope] = useState<AffectEnvelope | null>(null)
  const [cliffs, setCliffs] = useState<Array<{ timeSec: number; delta: number }>>([])

  const load = useCallback(async () => {
    if (!projectId) return
    const env = await window.api.affect.get(projectId)
    setEnvelope(env)
    const c = await window.api.affect.detectCliffs(projectId)
    setCliffs(c)
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !envelope) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const series = envelope.arousalSeries
    ctx.beginPath()
    series.forEach((v, i) => {
      const x = (i / (series.length - 1)) * w
      const y = h - v * (h - 20) - 10
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = 'rgba(99,102,241,0.15)'
    ctx.fill()
  }, [envelope])

  const onPaint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!envelope || !projectId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const idx = Math.floor((x / rect.width) * envelope.arousalSeries.length)
    const next = { ...envelope, arousalSeries: [...envelope.arousalSeries] }
    const brush = 3
    const val = 1 - (e.clientY - rect.top) / rect.height
    for (let i = Math.max(0, idx - brush); i <= Math.min(next.arousalSeries.length - 1, idx + brush); i++) {
      next.arousalSeries[i] = Math.max(0, Math.min(1, val))
    }
    next.updatedAt = new Date().toISOString()
    setEnvelope(next)
    void window.api.affect.save(next).then(() => {
      fluidBus.emit({ type: 'affect:patched', projectId })
    })
  }

  if (!envelope) return <div className="p-4 text-text-muted text-sm">加载地形…</div>

  return (
    <div className="flex flex-col flex-1 p-4 min-h-0">
      <h3 className="text-sm font-medium mb-2">情感地形</h3>
      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        className="w-full rounded border border-border bg-bg-secondary cursor-crosshair"
        onMouseDown={onPaint}
        onMouseMove={(e) => e.buttons === 1 && onPaint(e)}
      />
      {cliffs.length > 0 && (
        <div className="mt-2 text-xs text-amber-400/90 p-2 rounded bg-amber-500/10">
          ⚠ {cliffs.length} 处情感落差 · 最近 {cliffs[0]?.timeSec.toFixed(1)}s Δ{cliffs[0]?.delta.toFixed(2)}
        </div>
      )}
    </div>
  )
}
