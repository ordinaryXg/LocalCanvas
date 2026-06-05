import { useEffect, useRef, useState } from 'react'
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

export function TimelinePreview({ clips, playheadTime, subtitleCues }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const activeClipIdRef = useRef<string | null>(null)
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

  if (!active) {
    return (
      <div className="h-24 bg-bg-primary rounded border border-border flex items-center justify-center text-[10px] text-text-muted">
        拖动播放指针预览片段
      </div>
    )
  }

  if (decodeError) {
    return (
      <div className="h-24 bg-bg-primary rounded border border-border flex items-center justify-center text-[10px] text-text-muted">
        无法预览该片段（编码不支持或文件缺失）
      </div>
    )
  }

  return (
    <div className="h-24 bg-black rounded border border-border overflow-hidden relative">
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
  )
}
