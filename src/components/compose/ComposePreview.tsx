import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { findClipAtTime } from '../../utils/timelineClipAtTime'
import { mimeFromAssetPath } from '../../utils/assetStorage'
import { SubtitleOverlay } from '../timeline/SubtitleTrack'
import type { SubtitleCue } from '../../utils/parseSrt'
import { findCueAtTime } from '../../utils/parseSrt'
import { formatTimeCode } from '../../utils/composeSequence'

export interface PreviewClip {
  id: string
  name?: string
  absolutePath: string
  startTime: number
  duration: number
  trimIn?: number
}

interface Props {
  clips: PreviewClip[]
  playheadTime: number
  totalDuration: number
  subtitleCues?: SubtitleCue[]
  isPlaying: boolean
  previewHeight: number
  onPreviewHeightChange: (h: number) => void
  onTogglePlay: () => void
  onSeek: (time: number) => void
}

const MIN_H = 120
const MAX_H = 520

export function ComposePreview({
  clips,
  playheadTime,
  totalDuration,
  subtitleCues,
  isPlaying,
  previewHeight,
  onPreviewHeightChange,
  onTogglePlay,
  onSeek,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const loadedClipIdRef = useRef<string | null>(null)
  const blobCacheRef = useRef<Map<string, string>>(new Map())
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const [decodeError, setDecodeError] = useState(false)
  const [loadingClipId, setLoadingClipId] = useState<string | null>(null)

  const active = findClipAtTime(clips, playheadTime)
  const activeCue = subtitleCues?.length ? findCueAtTime(subtitleCues, playheadTime) : null
  const displayClip = active ?? (clips.length > 0 ? { clip: clips[clips.length - 1], offsetInClip: 0 } : null)

  useEffect(() => {
    return () => {
      for (const url of blobCacheRef.current.values()) {
        URL.revokeObjectURL(url)
      }
      blobCacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!displayClip) {
      setBlobSrc(null)
      setDecodeError(false)
      setLoadingClipId(null)
      return
    }

    const { clip } = displayClip
    const cached = blobCacheRef.current.get(clip.id)
    if (cached) {
      setBlobSrc(cached)
      setDecodeError(false)
      setLoadingClipId(null)
      return
    }

    let cancelled = false
    setLoadingClipId(clip.id)
    setDecodeError(false)

    void (async () => {
      try {
        const buffer = await window.api.file.readAbsolutePath(clip.absolutePath)
        if (cancelled) return
        const ext = clip.absolutePath.split('.').pop() ?? 'mp4'
        const url = URL.createObjectURL(
          new Blob([buffer], { type: mimeFromAssetPath(`videos/x.${ext}`) }),
        )
        blobCacheRef.current.set(clip.id, url)
        setBlobSrc(url)
        setLoadingClipId(null)
      } catch {
        if (!cancelled) {
          setDecodeError(true)
          setLoadingClipId(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [displayClip?.clip.id, displayClip?.clip.absolutePath])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !active || !blobSrc) return

    const offset = (active.clip.trimIn ?? 0) + active.offsetInClip
    if (!Number.isFinite(offset)) return

    const applySeek = () => {
      const drift = Math.abs(video.currentTime - offset)
      if (isPlaying || drift > 0.03) {
        video.currentTime = offset
      }
    }

    if (loadedClipIdRef.current !== active.clip.id) {
      loadedClipIdRef.current = active.clip.id
      video.src = blobSrc
      video.load()
      video.addEventListener('loadeddata', applySeek, { once: true })
      return
    }

    if (video.readyState >= 2) {
      applySeek()
    } else {
      video.addEventListener('loadeddata', applySeek, { once: true })
    }
  }, [
    active?.clip.id,
    active?.clip.trimIn,
    active?.offsetInClip,
    blobSrc,
    playheadTime,
    isPlaying,
  ])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = e.clientY - resizeRef.current.startY
      const next = Math.min(MAX_H, Math.max(MIN_H, resizeRef.current.startHeight + delta))
      onPreviewHeightChange(next)
    }
    const onUp = () => {
      resizeRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onPreviewHeightChange])

  const startResize = (e: ReactMouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startY: e.clientY, startHeight: previewHeight }
  }

  const stepSeek = (delta: number) => {
    onSeek(Math.max(0, Math.min(totalDuration, playheadTime + delta)))
  }

  return (
    <div className="flex flex-col shrink-0 border-b border-border">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div
            className="bg-black relative overflow-hidden"
            style={{ height: previewHeight }}
          >
            {!displayClip ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-muted text-sm gap-2">
                <span>将视频节点连接到合成节点</span>
                <span className="text-[10px]">片段将出现在下方时间轴</span>
              </div>
            ) : decodeError ? (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
                无法预览该片段
              </div>
            ) : !blobSrc || loadingClipId === displayClip.clip.id ? (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
                加载预览…
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                muted
                playsInline
                preload="auto"
                onError={() => setDecodeError(true)}
              />
            )}
            <SubtitleOverlay cue={activeCue} />
            {displayClip && (
              <div className="absolute bottom-2 left-3 text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded">
                {displayClip.clip.name || displayClip.clip.id}
                {active ? ` · ${active.offsetInClip.toFixed(1)}s` : ''}
              </div>
            )}
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={startResize}
            className="h-1.5 cursor-ns-resize flex items-center justify-center hover:bg-accent/10"
          >
            <span className="w-10 h-0.5 rounded-full bg-border" />
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-bg-secondary/50">
            <button
              type="button"
              onClick={() => onSeek(0)}
              className="text-text-muted hover:text-white text-sm"
              title="回到开头"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => onSeek(totalDuration)}
              className="text-text-muted hover:text-white text-sm"
              title="跳到结尾"
            >
              ⏭
            </button>
            <span className="text-xs text-text-muted tabular-nums">
              {formatTimeCode(playheadTime)} / {formatTimeCode(totalDuration)}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => stepSeek(-0.1)}
              className="text-[10px] text-text-muted hover:text-white"
            >
              -0.1s
            </button>
            <button
              type="button"
              onClick={() => stepSeek(0.1)}
              className="text-[10px] text-text-muted hover:text-white"
            >
              +0.1s
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
