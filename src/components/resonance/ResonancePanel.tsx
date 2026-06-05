import { useCallback, useEffect, useState } from 'react'
import type { ResonanceSource } from '../../types/fluid'
import { useProjectStore } from '../../stores/projectStore'
import { TuningOrbit } from './TuningOrbit'
import { fluidBus } from '../../lib/fluidBus'
import { useFluidCompiler } from '../../hooks/useFluidCompiler'

export function ResonancePanel() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [sources, setSources] = useState<ResonanceSource[]>([])
  const [phrase, setPhrase] = useState('')
  const { compileDown } = useFluidCompiler()

  const reload = useCallback(async () => {
    if (!projectId) return
    const list = await window.api.resonance.list(projectId)
    setSources(list)
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  const patchGravity = async (id: string, gravity: number) => {
    await window.api.resonance.patch(id, { gravity })
    await reload()
    if (projectId) fluidBus.emit({ type: 'resonance:patched', projectId })
    void compileDown()
  }

  const addPhrase = async () => {
    if (!projectId || !phrase.trim()) return
    await window.api.resonance.create(projectId, 'phrase', { text: phrase.trim() })
    setPhrase('')
    await reload()
    fluidBus.emit({ type: 'resonance:patched', projectId })
    void compileDown()
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      <h3 className="text-sm font-medium text-text-primary">共鸣场</h3>
      <TuningOrbit sources={sources} onGravityChange={(id, g) => void patchGravity(id, g)} />
      <div className="flex gap-2">
        <input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addPhrase()}
          placeholder="雨夜心悸…"
          className="flex-1 text-xs px-2 py-1 rounded border border-border bg-bg-primary"
        />
        <button type="button" onClick={() => void addPhrase()} className="text-xs px-2 py-1 rounded bg-violet-600 text-white">
          添加
        </button>
      </div>
      <ul className="text-xs text-text-muted space-y-1">
        {sources.map((s) => (
          <li key={s.id} className="flex justify-between">
            <span>{s.summary.metaphor}</span>
            <span>{(s.gravity * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
