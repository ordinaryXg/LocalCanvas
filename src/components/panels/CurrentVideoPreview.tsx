import { useCallback, useEffect, useRef, useState } from 'react'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useProjectStore } from '../../stores/projectStore'
import { NodeImageThumb } from '../common/NodeImageThumb'

interface Props {
  videoSrc?: string
  videoAssetPath?: string
  fileName?: string
  isGenerating?: boolean
  progress?: number
  firstFrameSrc?: string
  firstFrameAssetPath?: string
  onTrim?: (start: number, end: number) => void
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 10)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`
}

export function CurrentVideoPreview({
  videoSrc,
  videoAssetPath,
  fileName,
  isGenerating,
  progress,
  firstFrameSrc,
  firstFrameAssetPath,
  onTrim,
}: Props) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [decodeError, setDecodeError] = useState(false)
  const [trimOpen, setTrimOpen] = useState(false)
  const [inPoint, setInPoint] = useState(0)
  const [outPoint, setOutPoint] = useState(0)

  const hasVideo = !!(videoSrc || videoAssetPath)
  const { src, loading, load } = useLazyAssetBlob(projectId, videoAssetPath, videoSrc)
  const displaySrc = videoSrc ?? src
  const hasStoryboardFrame = !!(firstFrameSrc || firstFrameAssetPath)

  useEffect(() => {
    setDecodeError(false)
    setIsPlaying(false)
    setTrimOpen(false)
    setCurrentTime(0)
    setDuration(0)
  }, [videoAssetPath, videoSrc])

  useEffect(() => {
    if (videoAssetPath && !videoSrc) void load()
  }, [videoAssetPath, videoSrc, load])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !displaySrc || decodeError) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onMeta = () => {
      setDuration(video.duration)
      setOutPoint(video.duration)
      setInPoint(0)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [displaySrc, decodeError])

  const togglePlay = useCallback(() => {
    if (!videoRef.current || decodeError) return
    if (isPlaying) videoRef.current.pause()
    else void videoRef.current.play()
  }, [decodeError, isPlaying])

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-2">
      <div className="flex-1 min-h-[100px] rounded-lg border border-border bg-black/50 flex items-center justify-center overflow-hidden relative">
        {hasVideo ? (
          decodeError ? (
            <span className="text-xs text-text-muted px-4 text-center">
              无法播放（编码不支持或文件缺失）
            </span>
          ) : displaySrc ? (
            <>
              <video
                ref={videoRef}
                src={displaySrc}
                className="max-w-full max-h-full object-contain"
                preload="metadata"
                playsInline
                onClick={togglePlay}
                onError={() => setDecodeError(true)}
              />
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition nodrag opacity-0 hover:opacity-100 focus:opacity-100"
                aria-label={isPlaying ? '暂停' : '播放'}
              >
                <span className="text-2xl text-white drop-shadow">{isPlaying ? '⏸' : '▶'}</span>
              </button>
            </>
          ) : (
            <span className="text-xs text-text-muted">{loading ? '加载中…' : '点击加载视频'}</span>
          )
        ) : hasStoryboardFrame ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <NodeImageThumb
              projectId={projectId}
              src={firstFrameSrc}
              assetPath={firstFrameAssetPath}
              alt="分镜首帧"
              className="max-w-full max-h-full object-contain opacity-90"
            />
            <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white/90 px-2 py-0.5 rounded">
              分镜首帧 · 生成后显示视频
            </div>
          </div>
        ) : (
          <div className="text-center text-text-muted text-xs px-4">
            <div className="text-3xl mb-2 opacity-60">🎬</div>
            {isGenerating ? '视频生成中…' : '生成或上传后将在此预览'}
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
            <div className="w-full bg-black/50 rounded-full h-1.5">
              <div
                className="bg-[var(--node-video)] h-1.5 rounded-full transition-all"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {hasVideo && displaySrc && !decodeError && (
        <div className="shrink-0 space-y-1.5 nodrag">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-7 h-7 rounded-full bg-bg-tertiary text-text-primary text-xs hover:bg-bg-primary border border-border"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={(e) => {
                const t = parseFloat(e.target.value)
                if (videoRef.current) videoRef.current.currentTime = t
                setCurrentTime(t)
              }}
              className="flex-1 accent-[var(--node-video)] h-1"
            />
            <span className="text-[10px] text-text-muted tabular-nums shrink-0">
              {formatTime(currentTime)}/{formatTime(duration)}
            </span>
          </div>

          {onTrim && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setTrimOpen((o) => !o)}
                className="text-[10px] px-2 py-0.5 rounded border border-border text-text-muted hover:text-text-primary hover:border-[var(--node-video)]/50"
              >
                ✂️ 裁取 {trimOpen ? '▴' : '▾'}
              </button>
              {fileName && (
                <span className="text-[10px] text-text-muted truncate">{fileName}</span>
              )}
            </div>
          )}

          {trimOpen && onTrim && (
            <div className="rounded border border-border bg-bg-tertiary/50 px-2 py-1.5 flex items-center gap-2 flex-wrap text-[10px]">
              <button type="button" onClick={() => setInPoint(currentTime)} className="text-[var(--studio-accent)]">
                入点 {formatTime(inPoint)}
              </button>
              <button type="button" onClick={() => setOutPoint(currentTime)} className="text-[var(--studio-accent)]">
                出点 {formatTime(outPoint)}
              </button>
              <span className="text-text-muted">片段 {formatTime(Math.max(0, outPoint - inPoint))}</span>
              <button
                type="button"
                onClick={() => onTrim(inPoint, outPoint)}
                disabled={outPoint <= inPoint}
                className="ml-auto px-2 py-0.5 rounded bg-[var(--status-error)] text-white disabled:opacity-40"
              >
                导出裁切
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
