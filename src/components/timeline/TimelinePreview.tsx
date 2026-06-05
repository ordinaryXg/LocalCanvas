import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { findClipAtTime } from '../../utils/timelineClipAtTime'
import { mimeFromAssetPath } from '../../utils/assetStorage'
import { SubtitleOverlay } from './SubtitleTrack'
import type { SubtitleCue } from '../../utils/parseSrt'
import { findCueAtTime } from '../../utils/parseSrt'

export interface PreviewClip {
  id: string
  name?: string
  absolutePath: string
  startTime: number
  duration: number
}

interface Props {
  clips: PreviewClip[]
  playheadTime: number
  subtitleCues?: SubtitleCue[]
}

const DEFAULT_PREVIEW_HEIGHT = 96
const MIN_PREVIEW_HEIGHT = 72
const MAX_PREVIEW_HEIGHT = 480

export function TimelinePreview({ clips, playheadTime, subtitleCues }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const activeClipIdRef = useRef<string | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const [previewHeight, setPreviewHeight] = useState(DEFAULT_PREVIEW_HEIGHT)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const [decodeError, setDecodeError] = useState(false)
  const active = findClipAtTime(clips, playheadTime)
  const activeCue = subtitleCues?.length ? findCueAtTime(subtitleCues, playheadTime) : null

  useEffect(() => {
    if (!active) {
      setBlobSrc(null)
      setDecodeError(false)
      return
    }

    let cancelled = false
    let revoked: string | null = null
    setDecodeError(false)

    void (async () => {
      try {
        const buffer = await window.api.file.readAbsolutePath(active.clip.absolutePath)
        if (cancelled) return
        const ext = active.clip.absolutePath.split('.').pop() ?? 'mp4'
        const url = URL.createObjectURL(
          new Blob([buffer], { type: mimeFromAssetPath(`videos/x.${ext}`) }),
        )
        revoked = url
        setBlobSrc(url)
      } catch {
        if (!cancelled) setDecodeError(true)
      }
    })()

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [active?.clip.id, active?.clip.absolutePath])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !active || !blobSrc) return

    if (activeClipIdRef.current !== active.clip.id) {
      activeClipIdRef.current = active.clip.id
      video.src = blobSrc
      video.load()
    }

    const seek = () => {
      if (Number.isFinite(active.offsetInClip)) {
        video.currentTime = active.offsetInClip
      }
    }

    if (video.readyState >= 1) {
      seek()
    } else {
      video.addEventListener('loadedmetadata', seek, { once: true })
      return () => video.removeEventListener('loadedmetadata', seek)
    }
  }, [active, blobSrc])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = event.clientY - resizeRef.current.startY
      const next = Math.min(
        MAX_PREVIEW_HEIGHT,
        Math.max(MIN_PREVIEW_HEIGHT, resizeRef.current.startHeight + delta),
      )
      setPreviewHeight(next)
    }

    const onMouseUp = () => {
      resizeRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const startResize = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = { startY: event.clientY, startHeight: previewHeight }
  }

  const previewFrameClass =
    'bg-black rounded-t border border-border overflow-hidden relative shrink-0'

  if (!active) {
    return (
      <div className="rounded border border-border overflow-hidden">
        <div
          className="bg-bg-primary flex items-center justify-center text-[10px] text-text-muted"
          style={{ height: previewHeight }}
        >
          拖动播放指针预览片段
        </div>
        <PreviewResizeHandle onMouseDown={startResize} />
      </div>
    )
  }

  if (decodeError) {
    return (
      <div className="rounded border border-border overflow-hidden">
        <div
          className="bg-bg-primary flex items-center justify-center text-[10px] text-text-muted"
          style={{ height: previewHeight }}
        >
          无法预览该片段（编码不支持或文件缺失）
        </div>
        <PreviewResizeHandle onMouseDown={startResize} />
      </div>
    )
  }

  return (
    <div className="rounded border border-border overflow-hidden">
      <div className={previewFrameClass} style={{ height: previewHeight }}>
        {!blobSrc ? (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">
            加载预览…
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            muted
            playsInline
            preload="metadata"
            onError={() => setDecodeError(true)}
          />
        )}
        <SubtitleOverlay cue={activeCue} />
        <div className="absolute bottom-1 left-2 text-[9px] text-white/80 bg-black/50 px-1 rounded">
          {active.clip.name || active.clip.id} · {active.offsetInClip.toFixed(1)}s
        </div>
      </div>
      <PreviewResizeHandle onMouseDown={startResize} />
    </div>
  )
}

function PreviewResizeHandle({ onMouseDown }: { onMouseDown: (event: ReactMouseEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="调整预览高度"
      title="拖动调整预览高度"
      onMouseDown={onMouseDown}
      className="group h-2 cursor-ns-resize flex items-center justify-center border-t border-border hover:border-accent/30 hover:bg-accent/5 bg-bg-secondary"
    >
      <span className="w-8 h-0.5 rounded-full bg-border group-hover:bg-accent/60 transition-colors" />
    </div>
  )
}
