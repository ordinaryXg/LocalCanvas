import type { SubtitleCue } from '../../utils/parseSrt'

interface SubtitleTrackProps {
  cues: SubtitleCue[]
  playheadTime: number
  pixelsPerSecond?: number
  totalDuration: number
  labelWidth?: number
  embedded?: boolean
}

export function SubtitleTrack({
  cues,
  playheadTime,
  pixelsPerSecond = 50,
  totalDuration,
  labelWidth = 60,
  embedded,
}: SubtitleTrackProps) {
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 600)

  return (
    <div className={embedded ? '' : 'border-t border-border bg-bg-secondary'}>
      <div className="flex">
        <div
          className="shrink-0 flex items-center px-2 text-[10px] text-text-muted border-r border-border"
          style={{ width: labelWidth }}
        >
          字幕
        </div>
        <div className="relative overflow-hidden" style={{ width: timelineWidth, height: 36 }}>
          {cues.map((cue) => {
            const left = cue.startTime * pixelsPerSecond
            const width = Math.max((cue.endTime - cue.startTime) * pixelsPerSecond, 24)
            const active = playheadTime >= cue.startTime && playheadTime < cue.endTime
            return (
              <div
                key={cue.id}
                className={`absolute top-1 h-7 rounded px-1 text-[9px] truncate border ${
                  active
                    ? 'bg-accent/30 border-accent text-white'
                    : 'bg-bg-tertiary border-border text-text-muted'
                }`}
                style={{ left, width }}
                title={cue.text}
              >
                {cue.text}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface SubtitleOverlayProps {
  cue: SubtitleCue | null
}

export function SubtitleOverlay({ cue }: SubtitleOverlayProps) {
  if (!cue) return null
  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4">
      <div className="bg-black/70 text-white text-sm px-3 py-1 rounded max-w-[90%] text-center leading-snug">
        {cue.text}
      </div>
    </div>
  )
}
