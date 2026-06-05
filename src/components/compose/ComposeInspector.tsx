import type { ComposeClipItem } from '../../types/node'
import { formatTimeCode } from '../../utils/composeSequence'

interface Props {
  clip: ComposeClipItem | null
  audioSelected: boolean
  audioVolume: number
  onClipUpdate: (clipId: string, patch: Partial<ComposeClipItem>) => void
  onAudioVolumeChange: (volume: number) => void
  onOpenSourceNode: (nodeId: string) => void
  onClose: () => void
}

export function ComposeInspector({
  clip,
  audioSelected,
  audioVolume,
  onClipUpdate,
  onAudioVolumeChange,
  onOpenSourceNode,
  onClose,
}: Props) {
  if (!clip && !audioSelected) return null

  const trimIn = clip?.trimIn ?? 0
  const sourceDuration = clip?.sourceDuration ?? clip?.duration ?? 0
  const trimOut = trimIn + (clip?.duration ?? 0)

  return (
    <div className="w-60 shrink-0 border-l border-border bg-bg-secondary/80 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs text-text-muted">检查器</span>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-white text-xs">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto lc-scroll p-3 space-y-3 text-xs">
        {clip && (
          <>
            <div>
              <div className="text-text-muted mb-1">片段</div>
              <div className="text-text-primary truncate" title={clip.name}>
                {clip.name || clip.id}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-text-muted">
                入点 (s)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={Number(trimIn.toFixed(2))}
                  onChange={(e) => {
                    const next = Math.max(0, parseFloat(e.target.value) || 0)
                    const maxDur = Math.max(0.5, sourceDuration - next)
                    onClipUpdate(clip.id, {
                      trimIn: next,
                      duration: Math.min(clip.duration, maxDur),
                    })
                  }}
                  className="mt-1 w-full bg-bg-primary border border-border rounded px-2 py-1 text-text-primary"
                />
              </label>
              <label className="text-text-muted">
                出点 (s)
                <input
                  type="number"
                  min={0.5}
                  step={0.1}
                  value={Number(trimOut.toFixed(2))}
                  onChange={(e) => {
                    const nextOut = parseFloat(e.target.value) || trimIn + 0.5
                    onClipUpdate(clip.id, {
                      duration: Math.max(0.5, Math.min(nextOut - trimIn, sourceDuration - trimIn)),
                    })
                  }}
                  className="mt-1 w-full bg-bg-primary border border-border rounded px-2 py-1 text-text-primary"
                />
              </label>
            </div>

            <div className="text-text-muted">
              使用 {formatTimeCode(clip.duration)} / 源{' '}
              {formatTimeCode(sourceDuration)}
            </div>

            {clip.excluded && (
              <p className="text-amber-400 text-[10px]">已从成片排除（连线保留）</p>
            )}

            {clip.sourceNodeId && (
              <button
                type="button"
                onClick={() => onOpenSourceNode(clip.sourceNodeId!)}
                className="text-accent hover:underline"
              >
                在源节点中打开 →
              </button>
            )}
          </>
        )}

        {audioSelected && (
          <div>
            <div className="text-text-muted mb-2">背景音乐音量</div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audioVolume * 100)}
              onChange={(e) => onAudioVolumeChange(parseInt(e.target.value, 10) / 100)}
              className="w-full accent-accent"
            />
            <div className="text-right text-text-muted mt-1">{Math.round(audioVolume * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  )
}
