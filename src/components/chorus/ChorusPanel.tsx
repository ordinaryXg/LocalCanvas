import { useState } from 'react'
import type { ChorusResolution } from '../../types/fluid'
import { useProjectStore } from '../../stores/projectStore'
import { useFluidCompiler } from '../../hooks/useFluidCompiler'

const VOICES = ['impulse', 'skeptic', 'nostalgic', 'perfectionist', 'bystander', 'dormant'] as const

export function ChorusPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [utterances, setUtterances] = useState<Array<{ voiceId: string; text: string; stance: string }>>([])
  const [resolution, setResolution] = useState<ChorusResolution | null>(null)
  const [loading, setLoading] = useState(false)
  const { compileDown } = useFluidCompiler()

  const deliberate = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const result = await window.api.chorus.deliberate(projectId)
      setUtterances(result.utterances)
      setResolution(result.resolution)
    } finally {
      setLoading(false)
    }
  }

  const apply = async () => {
    if (!projectId || !resolution) return
    await window.api.chorus.apply(projectId, resolution)
    void compileDown()
  }

  return (
    <div className="flex flex-col h-full p-3 gap-2 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">内在合唱团</h3>
        <button
          type="button"
          disabled={loading}
          onClick={() => void deliberate()}
          className="text-xs px-2 py-1 rounded bg-violet-600 text-white disabled:opacity-50"
        >
          合议
        </button>
      </div>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {utterances.map((u, i) => (
          <div
            key={i}
            className={`text-xs p-2 rounded border-l-2 ${
              u.stance === 'oppose' ? 'border-red-400 bg-red-500/10' : 'border-violet-400'
            }`}
          >
            <span className="text-text-muted">{u.voiceId}: </span>
            {u.text}
          </div>
        ))}
      </div>
      {resolution && (
        <button type="button" onClick={() => void apply()} className="text-xs py-2 rounded bg-bg-secondary border border-border">
          应用决议
        </button>
      )}
      <div className="flex flex-wrap gap-1">
        {VOICES.map((v) => (
          <span key={v} className="text-[10px] px-1 rounded bg-bg-secondary text-text-muted">
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}
