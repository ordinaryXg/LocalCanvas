import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getVideoNodePorts } from '../../capabilities/node-port-ui'
import { VIDEO_UNIFIED_INPUT_HANDLE } from '../../capabilities/video-inbound-handle'
import { useOpenGeneratorDrawer } from '../inspector/useOpenGeneratorDrawer'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'
import { CANVAS_NODE_SHELL_PAD } from '../../utils/imageNodeDisplay'
import {
  computeVideoDisplaySize,
  emptyVideoDisplaySize,
  VIDEO_CANVAS_EMPTY_HEIGHT,
  VIDEO_CANVAS_EMPTY_WIDTH,
  VIDEO_CANVAS_MAX_HEIGHT,
  VIDEO_CANVAS_MIN_HEIGHT,
  VIDEO_CANVAS_MIN_WIDTH,
} from '../../utils/videoNodeDisplay'

function VideoNodeComponent({ id, data, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const uploadMedia = useNodeMediaUpload(id, 'video')
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const edges = useCanvasStore((s) => s.edges)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { openDrawer } = useOpenGeneratorDrawer(id)
  const modelId = typeof data.modelId === 'string' ? data.modelId : undefined
  const variant = useMemo(() => getNodeVisualVariant(id), [id])

  const [displaySize, setDisplaySize] = useState(emptyVideoDisplaySize())
  const [playing, setPlaying] = useState(false)

  const videoAssetPath =
    typeof data.videoAssetPath === 'string' ? data.videoAssetPath : undefined
  const inlineVideoSrc = typeof data.videoSrc === 'string' ? data.videoSrc : undefined
  const hasVideo = !!(inlineVideoSrc || videoAssetPath)
  const firstFrameSrc = typeof data.firstFrameSrc === 'string' ? data.firstFrameSrc : undefined
  const firstFrameAssetPath =
    typeof data.firstFrameAssetPath === 'string' ? data.firstFrameAssetPath : undefined
  const hasPoster = !!(firstFrameSrc || firstFrameAssetPath)
  const isEmpty = !hasVideo && !hasPoster
  const isGenerating = data.isGenerating === true
  const errorMessage = typeof data.error === 'string' ? data.error : undefined

  const { src: mediaSrc, loading: mediaLoading, load: loadMedia, revoke: revokeMedia } =
    useLazyAssetBlob(projectId, videoAssetPath, inlineVideoSrc)
  const { src: posterSrc, loading: posterLoading, load: loadPoster, revoke: revokePoster } =
    useLazyAssetBlob(projectId, firstFrameAssetPath, firstFrameSrc)

  const videoSrc = mediaSrc ?? inlineVideoSrc
  const posterImageSrc = posterSrc ?? firstFrameSrc

  const hiddenInputHandles = useMemo(() => {
    const fromModel = getVideoNodePorts(modelId).map((p) => p.id)
    const fromEdges = edges
      .filter((e) => e.target === id && e.targetHandle && e.targetHandle !== VIDEO_UNIFIED_INPUT_HANDLE)
      .map((e) => e.targetHandle as string)
    return [...new Set([...fromModel, ...fromEdges])]
  }, [edges, id, modelId])

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files[0]
      if (file?.type.startsWith('video/')) loadFile(file)
    },
    [loadFile],
  )

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!selected || !videoRef.current || !videoSrc) return
      if (playing) {
        videoRef.current.pause()
        setPlaying(false)
        return
      }
      void videoRef.current.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
    },
    [playing, selected, videoSrc],
  )

  useEffect(() => {
    if (!selected && playing) {
      videoRef.current?.pause()
      setPlaying(false)
    }
  }, [playing, selected])

  useEffect(() => {
    setPlaying(false)
    if (!videoSrc && !posterImageSrc) {
      setDisplaySize(emptyVideoDisplaySize())
    }
  }, [posterImageSrc, videoSrc])

  useEffect(() => {
    if (!posterImageSrc || videoSrc) return
    const probe = new Image()
    probe.onload = () => {
      setDisplaySize(computeVideoDisplaySize(probe.naturalWidth, probe.naturalHeight))
    }
    probe.src = posterImageSrc
  }, [posterImageSrc, videoSrc])

  const handleVideoMetadata = useCallback(() => {
    const el = videoRef.current
    if (!el || el.videoWidth <= 0) return
    setDisplaySize(computeVideoDisplaySize(el.videoWidth, el.videoHeight))
  }, [])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.max(VIDEO_CANVAS_MIN_WIDTH, Math.ceil(shell.offsetWidth))
        const measuredHeight = Math.min(
          VIDEO_CANVAS_MAX_HEIGHT + CANVAS_NODE_SHELL_PAD * 2,
          Math.max(VIDEO_CANVAS_MIN_HEIGHT, Math.ceil(shell.offsetHeight)),
        )
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredWidth - lastW) < 2 && Math.abs(measuredHeight - lastH) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(id, measuredWidth, measuredHeight)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [displaySize, id, posterImageSrc, updateNodeSize, videoSrc])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (!visible) {
          videoRef.current?.pause()
          setPlaying(false)
          revokeMedia()
          revokePoster()
          return
        }
        if (videoAssetPath && !inlineVideoSrc) void loadMedia()
        if (firstFrameAssetPath && !firstFrameSrc) void loadPoster()
      },
      { root: null, rootMargin: '120px', threshold: 0 },
    )
    observer.observe(shell)
    return () => observer.disconnect()
  }, [
    firstFrameAssetPath,
    firstFrameSrc,
    inlineVideoSrc,
    loadMedia,
    loadPoster,
    revokeMedia,
    revokePoster,
    videoAssetPath,
  ])

  const openEditor = () => {
    openDrawer()
  }

  const frameWidth = isEmpty ? VIDEO_CANVAS_EMPTY_WIDTH : displaySize.width
  const frameHeight = isEmpty ? VIDEO_CANVAS_EMPTY_HEIGHT : displaySize.height
  const busy = mediaLoading || posterLoading || isGenerating
  const canPlay = !!(selected && videoSrc && !busy)

  return (
    <>
      <div ref={shellRef} className="video-node-shell">
        <div
          className={`video-node-frame ${selected ? 'video-node-frame--selected' : ''} ${
            isEmpty ? 'video-node-frame--empty' : ''
          } ${errorMessage ? 'video-node-frame--error' : ''}`}
          style={{
            borderRadius: variant.borderRadius,
            width: frameWidth,
            height: frameHeight,
          }}
          onDoubleClick={openEditor}
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            if (!isEmpty) return
            if (!selected) return
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          title={
            errorMessage ??
            (hasVideo
              ? selected
                ? '点击 ▶ 播放，双击在编辑台编辑'
                : '选中后可播放，双击在编辑台编辑'
              : hasPoster
                ? '双击在编辑台编辑'
                : selected
                  ? '点击上传本地视频，或拖入视频'
                  : '选中后点击上传，或拖入视频')
          }
        >
          <div className="video-node__media">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                className="video-node__video"
                style={{ objectFit: displaySize.clipped ? 'cover' : 'contain' }}
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={handleVideoMetadata}
                onEnded={() => setPlaying(false)}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
              />
            ) : posterImageSrc ? (
              <img
                src={posterImageSrc}
                alt=""
                className="video-node__poster"
                style={{ objectFit: displaySize.clipped ? 'cover' : 'contain' }}
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setDisplaySize(
                    computeVideoDisplaySize(img.naturalWidth, img.naturalHeight),
                  )
                }}
              />
            ) : (
              <div className="video-node__placeholder" aria-hidden />
            )}

            {displaySize.clipped && !isEmpty && (
              <div className="video-node__fade" aria-hidden />
            )}

            <button
              type="button"
              className={`video-node__play nodrag ${
                canPlay ? '' : 'video-node__play--idle'
              }`}
              onClick={togglePlay}
              disabled={!canPlay}
              aria-label={playing ? '暂停' : '播放'}
            >
              {playing ? '⏸' : '▶'}
            </button>
          </div>

          {busy && (
            <div className="video-node__overlay" aria-hidden>
              <div className="video-node__spinner" />
            </div>
          )}

          <Handle
            type="target"
            position={Position.Left}
            id={VIDEO_UNIFIED_INPUT_HANDLE}
            className="video-node__handle"
            style={{ top: '50%' }}
          />
          {hiddenInputHandles.map((handleId) => (
            <Handle
              key={`hidden-in-${handleId}`}
              type="target"
              position={Position.Left}
              id={handleId}
              className="video-node__handle video-node__handle--hidden"
              style={{ top: '50%' }}
            />
          ))}
          <Handle
            type="source"
            position={Position.Right}
            id="video"
            className="video-node__handle"
            style={{ top: '50%' }}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}

export const VideoNode = memo(VideoNodeComponent)
