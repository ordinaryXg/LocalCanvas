import { useState, useRef, useEffect, useCallback } from 'react'
import {
  filterClipsInTimeRange,
  visibleTimeRangeFromScroll,
} from '../../utils/timelineVisibleClips'

export interface TimelineClip {
  id: string
  name: string
  path: string
  duration: number
  startTime: number
}

export interface TimelineTrack {
  id: string
  type: 'video' | 'audio'
  clips: TimelineClip[]
}

interface Props {
  tracks: TimelineTrack[]
  totalDuration: number
  onClipMove?: (trackId: string, clipId: string, newStartTime: number) => void
  onClipSelect?: (clipId: string) => void
  onCompose?: (tracks: TimelineTrack[]) => void
  onPlayheadChange?: (time: number) => void
  isComposing?: boolean
  composeProgress?: number
  embedded?: boolean
}

export function Timeline({
  tracks,
  totalDuration,
  onClipMove,
  onClipSelect,
  onCompose,
  onPlayheadChange,
  isComposing,
  composeProgress,
  embedded,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [pixelsPerSecond] = useState(50)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: totalDuration })

  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 600)
  const labelWidth = 60

  const updateVisibleRange = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const range = visibleTimeRangeFromScroll(
      el.scrollLeft,
      el.clientWidth,
      labelWidth,
      pixelsPerSecond,
      totalDuration,
    )
    setVisibleRange(range)
  }, [pixelsPerSecond, totalDuration])

  useEffect(() => {
    updateVisibleRange()
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', updateVisibleRange)
    window.addEventListener('resize', updateVisibleRange)
    return () => {
      el.removeEventListener('scroll', updateVisibleRange)
      window.removeEventListener('resize', updateVisibleRange)
    }
  }, [updateVisibleRange, totalDuration])

  const updatePlayhead = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, totalDuration))
      setPlayheadTime(clamped)
      onPlayheadChange?.(clamped)
    },
    [onPlayheadChange, totalDuration],
  )

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDraggingPlayhead(true)
  }, [])

  useEffect(() => {
    if (!isDraggingPlayhead) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - 60
      const time = Math.max(0, x / pixelsPerSecond)
      updatePlayhead(time)
    }

    const handleMouseUp = () => setIsDraggingPlayhead(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingPlayhead, pixelsPerSecond, updatePlayhead])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className={embedded ? '' : 'bg-bg-tertiary border-t border-border shrink-0'}>
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">🎬 时间轴</span>
            <span className="text-xs text-text-muted">
              {formatTime(playheadTime)} / {formatTime(totalDuration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCompose?.(tracks)}
              disabled={isComposing || tracks.every((t) => t.clips.length === 0)}
              className="text-xs px-4 py-1.5 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition"
            >
              {isComposing ? `合成中 ${composeProgress || 0}%` : '🎬 合成导出'}
            </button>
          </div>
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[10px] text-text-muted">
            {formatTime(playheadTime)} / {formatTime(totalDuration)}
          </span>
          <button
            type="button"
            onClick={() => onCompose?.(tracks)}
            disabled={isComposing || tracks.every((t) => t.clips.length === 0)}
            className="text-[10px] px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
          >
            {isComposing ? `合成中 ${composeProgress || 0}%` : '🎬 合成导出'}
          </button>
        </div>
      )}

      <div ref={containerRef} className="overflow-x-auto lc-scroll lc-scroll-x" style={{ height: tracks.length * 50 + 30 }}>
        <div style={{ width: timelineWidth + 100, position: 'relative' }}>
          <div className="h-[30px] border-b border-border relative" style={{ marginLeft: 60 }}>
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 h-full" style={{ left: i * pixelsPerSecond }}>
                <div className="w-px h-3 bg-text-muted/40" />
                <span className="text-[9px] text-text-muted absolute top-3">{formatTime(i)}</span>
              </div>
            ))}
          </div>

          {tracks.map((track) => (
            <div key={track.id} className="flex h-[50px] border-b border-border/50">
              <div className="w-[60px] flex items-center justify-center text-[10px] text-text-muted border-r border-border">
                {track.type === 'video' ? '🎥' : '🎵'}
              </div>

              <div className="flex-1 relative">
                {filterClipsInTimeRange(track.clips, visibleRange.start, visibleRange.end).map(
                  (clip) => (
                  <div
                    key={clip.id}
                    role="button"
                    tabIndex={0}
                    className="absolute top-1 h-[38px] rounded cursor-move flex items-center px-2 text-[10px] text-white truncate nodrag"
                    style={{
                      left: clip.startTime * pixelsPerSecond,
                      width: Math.max(clip.duration * pixelsPerSecond - 2, 20),
                      backgroundColor: track.type === 'video' ? 'var(--token-canvas-accent)' : 'var(--token-success)',
                      opacity: 0.85,
                    }}
                    onClick={() => onClipSelect?.(clip.id)}
                    onKeyDown={() => {}}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return
                      const startX = e.clientX
                      const startLeft = clip.startTime * pixelsPerSecond

                      const handleMove = (moveEvent: MouseEvent) => {
                        const dx = moveEvent.clientX - startX
                        const newStartTime = Math.max(0, (startLeft + dx) / pixelsPerSecond)
                        onClipMove?.(track.id, clip.id, newStartTime)
                      }

                      const handleUp = () => {
                        window.removeEventListener('mousemove', handleMove)
                        window.removeEventListener('mouseup', handleUp)
                      }

                      window.removeEventListener('mousemove', handleMove)
                      window.removeEventListener('mouseup', handleUp)
                      window.addEventListener('mousemove', handleMove)
                      window.addEventListener('mouseup', handleUp)
                    }}
                  >
                    {clip.name}
                  </div>
                  ),
                )}
              </div>
            </div>
          ))}

          <div
            className="absolute top-[30px] bottom-0 w-0.5 bg-red-500 z-10 cursor-col-resize"
            style={{ left: playheadTime * pixelsPerSecond + 60 }}
            onMouseDown={handlePlayheadMouseDown}
            role="slider"
            aria-valuenow={playheadTime}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
          </div>
        </div>
      </div>
    </div>
  )
}
