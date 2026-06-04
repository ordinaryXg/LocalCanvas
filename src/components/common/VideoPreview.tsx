import { useRef, useState, useEffect } from 'react'

interface Props {
  src: string
  onClose: () => void
  onTrim?: (start: number, end: number) => void
}

export function VideoPreview({ src, onClose, onTrim }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [inPoint, setInPoint] = useState(0)
  const [outPoint, setOutPoint] = useState(0)
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [decodeError, setDecodeError] = useState(false)

  useEffect(() => {
    setDecodeError(false)
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || decodeError) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setOutPoint(video.duration)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [src, decodeError])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    const ms = Math.floor((s % 1) * 10)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else void videoRef.current.play()
  }

  const frameStep = (direction: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + direction / 30),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[800px] bg-bg-secondary rounded-xl overflow-hidden border border-border">
        <div className="relative bg-black aspect-video">
          {decodeError ? (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
              无法播放该视频（编码不支持或文件损坏）
            </div>
          ) : (
            <video
              ref={videoRef}
              src={src}
              className="w-full h-full object-contain"
              preload="metadata"
              onClick={togglePlay}
              onError={() => setDecodeError(true)}
            />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full text-white hover:bg-black/80 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-2">
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
            className="w-full accent-accent"
          />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => frameStep(-1)} className="text-white text-sm">
              ⏮
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 bg-accent rounded-full text-white flex items-center justify-center hover:bg-accent-hover"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button type="button" onClick={() => frameStep(1)} className="text-white text-sm">
              ⏭
            </button>
            <span className="text-xs text-text-muted ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onTrim && !showTrimmer && (
              <button
                type="button"
                onClick={() => setShowTrimmer(true)}
                className="text-xs px-3 py-1 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-secondary"
              >
                ✂️ 裁取
              </button>
            )}
          </div>
        </div>

        {showTrimmer && onTrim && (
          <div className="px-4 py-3 border-t border-border bg-bg-tertiary/50">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="text-xs text-text-muted">
                入点:{' '}
                <button
                  type="button"
                  onClick={() => setInPoint(currentTime)}
                  className="text-accent"
                >
                  I {formatTime(inPoint)}
                </button>
              </div>
              <div className="text-xs text-text-muted">
                出点:{' '}
                <button
                  type="button"
                  onClick={() => setOutPoint(currentTime)}
                  className="text-accent"
                >
                  O {formatTime(outPoint)}
                </button>
              </div>
              <span className="text-xs text-text-muted">
                选中: {formatTime(outPoint - inPoint)}
              </span>
              <button
                type="button"
                onClick={() => onTrim(inPoint, outPoint)}
                className="ml-auto text-xs px-4 py-1.5 bg-danger text-white rounded hover:opacity-90"
              >
                ✂️ 裁取片段
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
