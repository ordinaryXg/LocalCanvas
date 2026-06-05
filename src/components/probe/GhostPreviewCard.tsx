import { useEffect, useState } from 'react'
import type { GhostPreview } from '../../types/fluid'
import { useProjectStore } from '../../stores/projectStore'
import { FLUID_PROBE } from '../../constants/fluidFeatures'

export function GhostPreviewCard() {
  const [preview, setPreview] = useState<GhostPreview | null>(null)
  const projectId = useProjectStore((s) => s.currentProjectId)

  useEffect(() => {
    if (!FLUID_PROBE) return
    const unsub = window.api.on('probe:ready', (data: unknown) => {
      const p = data as GhostPreview
      if (p.projectId === projectId) setPreview(p)
    })
    return unsub
  }, [projectId])

  useEffect(() => {
    if (!preview) return
    const t = setTimeout(() => setPreview(null), 30000)
    return () => clearTimeout(t)
  }, [preview])

  if (!preview) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 w-60 rounded-lg border border-violet-400/35 bg-zinc-900/80 backdrop-blur-md p-2 shadow-xl">
      <div className="text-[10px] uppercase tracking-wide text-violet-300 mb-1">幽灵 · 非最终</div>
      <p className="text-[11px] text-text-muted line-clamp-2 mb-2">{preview.compiledPrompt}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 text-xs py-1 rounded bg-violet-600 text-white"
          onClick={() => setPreview(null)}
        >
          点头
        </button>
        <button
          type="button"
          className="flex-1 text-xs py-1 rounded border border-border text-text-muted"
          onClick={() => setPreview(null)}
        >
          摇头
        </button>
      </div>
    </div>
  )
}
