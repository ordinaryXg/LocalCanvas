import { useCallback, useEffect, useState } from 'react'
import type { PalimpsestLayer } from '../../types/fluid'
import { useProjectStore } from '../../stores/projectStore'

export function PalimpsestStrataPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [layers, setLayers] = useState<PalimpsestLayer[]>([])
  const [query, setQuery] = useState('')

  const reload = useCallback(async () => {
    if (!projectId) return
    setLayers(await window.api.palimpsest.list(projectId))
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  const recall = async () => {
    if (!projectId || !query.trim()) return
    const tags = query.split(/\s+/)
    const found = await window.api.palimpsest.recall(projectId, { tags })
    if (found[0]) await window.api.palimpsest.reviveToResonance(projectId, found[0].id)
    void reload()
  }

  return (
    <div className="flex flex-col h-full p-3 gap-2 overflow-y-auto">
      <h3 className="text-sm font-medium">地层</h3>
      <div className="flex gap-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="召回：忧郁"
          className="flex-1 text-xs px-2 py-1 rounded border border-border bg-bg-primary"
        />
        <button type="button" onClick={() => void recall()} className="text-xs px-2 rounded bg-violet-600 text-white">
          召回
        </button>
      </div>
      {layers.map((l) => (
        <div key={l.id} className="text-xs p-2 rounded border border-border/50">
          <div className="text-text-muted">层{l.depth} · {l.eventType}</div>
          <div>{l.metaphorTags.join(', ') || l.textSnapshot?.slice(0, 40)}</div>
        </div>
      ))}
    </div>
  )
}
