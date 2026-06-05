import { formatTimeCode, getActiveClips, totalActiveDuration } from '../../utils/composeSequence'
import type { ComposeClipItem } from '../../types/node'

interface Props {
  clips: ComposeClipItem[]
  isComposing: boolean
  composeProgress: number
  focusMode: boolean
  onExport: () => void
  onImportSubtitle: () => void
  onToggleSettings: () => void
  onToggleFocus: () => void
  onClose: () => void
  subtitleCount: number
}

export function ComposeToolbar({
  clips,
  isComposing,
  composeProgress,
  focusMode,
  onExport,
  onImportSubtitle,
  onToggleSettings,
  onToggleFocus,
  onClose,
  subtitleCount,
}: Props) {
  const active = getActiveClips(clips)
  const duration = totalActiveDuration(clips)

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-bg-secondary shrink-0">
      <span className="text-sm text-text-primary">
        🎞️ 合成 · {active.length} 片段 · {formatTimeCode(duration)}
      </span>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onImportSubtitle}
        className="text-xs px-2 py-1 border border-border rounded hover:border-accent/40 text-text-muted hover:text-white"
      >
        字幕{subtitleCount > 0 ? ` (${subtitleCount})` : ''}
      </button>

      <button
        type="button"
        onClick={onToggleFocus}
        className="text-xs px-2 py-1 border border-border rounded hover:border-accent/40 text-text-muted hover:text-white"
        title={focusMode ? '显示画布' : '专注模式'}
      >
        {focusMode ? '显示画布' : '专注模式'}
      </button>

      <button
        type="button"
        onClick={onToggleSettings}
        className="text-xs px-2 py-1 border border-border rounded hover:border-accent/40 text-text-muted hover:text-white"
      >
        ···
      </button>

      <button
        type="button"
        onClick={onExport}
        disabled={active.length === 0 || isComposing}
        className="text-sm px-4 py-1.5 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 min-w-[100px]"
      >
        {isComposing ? `${composeProgress}%` : '导出 ▶'}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="text-text-muted hover:text-white text-xs px-2"
        title="收起剪辑台"
      >
        ✕
      </button>
    </div>
  )
}
