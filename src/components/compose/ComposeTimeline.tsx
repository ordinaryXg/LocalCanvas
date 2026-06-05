import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComposeClipItem } from '../../types/node'
import { applySequentialStartTimes, formatTimeCode, reorderClips } from '../../utils/composeSequence'
import { ComposeClipBlock } from './ComposeClipBlock'
import { ComposeSubtitleLane } from './ComposeSubtitleLane'
import type { SubtitleCue } from '../../utils/parseSrt'

interface Props {
  clips: ComposeClipItem[]
  clipPaths: Record<string, string>
  subtitleCues: SubtitleCue[]
  playheadTime: number
  totalDuration: number
  pixelsPerSecond: number
  hasAudio: boolean
  selectedClipId: string | null
  onClipsChange: (clips: ComposeClipItem[]) => void
  onSelectClip: (id: string | null) => void
  onSelectAudio: () => void
  onPlayheadChange: (time: number) => void
  onClipContextMenu: (e: React.MouseEvent, clipId: string) => void
  onPixelsPerSecondChange: (pps: number) => void
}

export function ComposeTimeline({
  clips,
  clipPaths,
  subtitleCues,
  playheadTime,
  totalDuration,
  pixelsPerSecond,
  hasAudio,
  selectedClipId,
  onClipsChange,
  onSelectClip,
  onSelectAudio,
  onPlayheadChange,
  onClipContextMenu,
  onPixelsPerSecondChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)

  const sequential = applySequentialStartTimes(clips)
  const activeClips = sequential.filter((c) => !c.excluded)
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond + 120, 600)
  const labelWidth = 60

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDraggingPlayhead(true)
  }, [])

  useEffect(() => {
    if (!isDraggingPlayhead) return
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - labelWidth + containerRef.current.scrollLeft
      const time = Math.max(0, x / pixelsPerSecond)
      onPlayheadChange(snapEnabled ? Math.round(time * 10) / 10 : time)
    }
    const onUp = () => setIsDraggingPlayhead(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingPlayhead, pixelsPerSecond, onPlayheadChange, snapEnabled])

  useEffect(() => {
    if (!draggingId) return

    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - labelWidth + containerRef.current.scrollLeft
      let targetIndex = 0
      let acc = 0
      for (let i = 0; i < activeClips.length; i++) {
        const mid = (acc + activeClips[i].duration / 2) * pixelsPerSecond
        if (x > mid) targetIndex = i + 1
        acc += activeClips[i].duration
      }
      const reordered = reorderClips(clips, draggingId, targetIndex)
      if (JSON.stringify(reordered) !== JSON.stringify(clips)) {
        onClipsChange(reordered)
      }
    }

    const onUp = () => setDraggingId(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingId, clips, activeClips, pixelsPerSecond, onClipsChange])

  const updateClipTrim = (clipId: string, trimIn: number, duration: number) => {
    onClipsChange(
      applySequentialStartTimes(
        clips.map((c) => (c.id === clipId ? { ...c, trimIn, duration } : c)),
      ),
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col border-t border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary/30 text-[10px] text-text-muted shrink-0">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1">
            缩放
            <input
              type="range"
              min={30}
              max={120}
              value={pixelsPerSecond}
              onChange={(e) => onPixelsPerSecondChange(parseInt(e.target.value, 10))}
              className="w-20 accent-accent"
            />
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.target.checked)}
              className="rounded"
            />
            吸附
          </label>
        </div>
        <span>
          {formatTimeCode(playheadTime)} / {formatTimeCode(totalDuration)}
        </span>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto lc-scroll lc-scroll-x">
        <div style={{ width: timelineWidth, minHeight: '100%' }}>
          <ComposeSubtitleLane
            cues={subtitleCues}
            playheadTime={playheadTime}
            totalDuration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
          />

          <div className="flex h-[50px] border-b border-border/50 relative">
            <div className="w-[60px] shrink-0 flex items-center justify-center text-[10px] text-text-muted border-r border-border">
              视频
            </div>
            <div className="flex-1 relative">
              {activeClips.map((clip) => (
                <ComposeClipBlock
                  key={clip.id}
                  clip={clip}
                  left={(clip.startTime ?? 0) * pixelsPerSecond}
                  width={clip.duration * pixelsPerSecond}
                  selected={selectedClipId === clip.id}
                  pixelsPerSecond={pixelsPerSecond}
                  absolutePath={clipPaths[clip.id]}
                  onSelect={() => onSelectClip(clip.id)}
                  onTrimChange={(trimIn, duration) => updateClipTrim(clip.id, trimIn, duration)}
                  onDragStart={setDraggingId}
                  onContextMenu={onClipContextMenu}
                />
              ))}
            </div>
          </div>

          <div className="flex h-[40px] border-b border-border/50">
            <div className="w-[60px] shrink-0 flex items-center justify-center text-[10px] text-text-muted border-r border-border">
              音频
            </div>
            <div
              className="flex-1 relative cursor-pointer"
              onClick={onSelectAudio}
              role="button"
              tabIndex={0}
              onKeyDown={() => {}}
            >
              {hasAudio ? (
                <div
                  className="absolute top-1 left-0 h-[30px] rounded bg-emerald-600/80 flex items-center px-2 text-[10px] text-white"
                  style={{ width: totalDuration * pixelsPerSecond }}
                >
                  背景音乐
                </div>
              ) : (
                <div className="h-full flex items-center px-2 text-[10px] text-text-muted">
                  连接音频节点到合成节点
                </div>
              )}
            </div>
          </div>

          <div className="h-[30px] border-b border-border relative" style={{ marginLeft: labelWidth }}>
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 h-full" style={{ left: i * pixelsPerSecond }}>
                <div className="w-px h-2 bg-text-muted/40" />
                <span className="text-[9px] text-text-muted absolute top-2">{formatTimeCode(i)}</span>
              </div>
            ))}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-col-resize"
              style={{ left: playheadTime * pixelsPerSecond }}
              onMouseDown={handlePlayheadMouseDown}
              role="slider"
              aria-valuenow={playheadTime}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
