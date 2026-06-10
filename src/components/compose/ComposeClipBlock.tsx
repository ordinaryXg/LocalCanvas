import { useEffect, useState } from 'react'
import type { ComposeClipItem } from '../../types/node'

interface Props {
  clip: ComposeClipItem
  left: number
  width: number
  selected: boolean
  pixelsPerSecond: number
  absolutePath?: string
  onSelect: () => void
  onTrimChange: (trimIn: number, duration: number) => void
  onDragStart: (clipId: string) => void
  onContextMenu: (e: React.MouseEvent, clipId: string) => void
}

export function ComposeClipBlock({
  clip,
  left,
  width,
  selected,
  pixelsPerSecond,
  absolutePath,
  onSelect,
  onTrimChange,
  onDragStart,
  onContextMenu,
}: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!absolutePath) {
      setThumbUrl(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const path = await window.api.asset.thumbnail(absolutePath)
        if (!cancelled) setThumbUrl(path)
      } catch {
        if (!cancelled) setThumbUrl(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [absolutePath])

  const startTrimDrag = (e: React.MouseEvent, edge: 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startTrimIn = clip.trimIn ?? 0
    const startDuration = clip.duration
    const maxSource = clip.sourceDuration ?? startDuration + startTrimIn

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / pixelsPerSecond
      if (edge === 'left') {
        const nextTrim = Math.max(0, Math.min(startTrimIn + dx, maxSource - 0.5))
        const nextDuration = Math.max(0.5, startDuration - (nextTrim - startTrimIn))
        onTrimChange(nextTrim, Math.min(nextDuration, maxSource - nextTrim))
      } else {
        const nextDuration = Math.max(0.5, Math.min(startDuration + dx, maxSource - startTrimIn))
        onTrimChange(startTrimIn, nextDuration)
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`absolute top-1 h-[38px] rounded overflow-hidden cursor-pointer border-2 ${
        selected ? 'border-white ring-1 ring-accent' : 'border-transparent'
      } ${clip.excluded ? 'opacity-40' : 'opacity-90'}`}
      style={{
        left,
        width: Math.max(width, 24),
        backgroundColor: 'var(--token-accent)',
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onKeyDown={() => {}}
      onContextMenu={(e) => onContextMenu(e, clip.id)}
      onMouseDown={(e) => {
        if (e.button !== 0 || (e.target as HTMLElement).dataset.trim) return
        onDragStart(clip.id)
      }}
    >
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
        />
      )}
      <div
        data-trim="left"
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-white/30"
        onMouseDown={(e) => startTrimDrag(e, 'left')}
      />
      <div
        data-trim="right"
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-white/30"
        onMouseDown={(e) => startTrimDrag(e, 'right')}
      />
      <span className="relative z-[1] text-[10px] text-white truncate px-2 leading-[38px] drop-shadow">
        {clip.name || clip.id}
      </span>
    </div>
  )
}
