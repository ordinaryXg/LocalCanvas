import { SubtitleTrack } from '../timeline/SubtitleTrack'
import type { SubtitleCue } from '../../utils/parseSrt'

interface Props {
  cues: SubtitleCue[]
  playheadTime: number
  totalDuration: number
  pixelsPerSecond: number
  collapsed?: boolean
}

export function ComposeSubtitleLane({
  cues,
  playheadTime,
  totalDuration,
  pixelsPerSecond,
  collapsed,
}: Props) {
  if (cues.length === 0) {
    return (
      <div className="flex h-7 border-b border-border/40">
        <div className="w-[60px] shrink-0 flex items-center justify-center text-[9px] text-text-muted border-r border-border">
          字幕
        </div>
        <div className="flex-1 flex items-center px-2 text-[9px] text-text-muted">
          顶栏「字幕」可导入 SRT
        </div>
      </div>
    )
  }

  if (collapsed) return null

  return (
    <SubtitleTrack
      cues={cues}
      playheadTime={playheadTime}
      pixelsPerSecond={pixelsPerSecond}
      totalDuration={totalDuration}
      embedded
    />
  )
}
