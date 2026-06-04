import { memo, useRef, useCallback, useState, useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { VideoPreview } from '../common/VideoPreview'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { trimVideoAsset, resolveAssetAbsolutePath } from '../../hooks/useCompose'
import { handleError } from '../../utils/ErrorHandler'
import { generateNodeId } from '../../utils/id'
import { NodeImageThumb } from '../common/NodeImageThumb'

function FrameSlot({
  label,
  projectId,
  src,
  assetPath,
  emptyHint,
}: {
  label: string
  projectId: string | null
  src?: string
  assetPath?: string
  emptyHint: string
}) {
  const hasImage = !!(src || assetPath)
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-text-muted">{label}</span>
      {hasImage ? (
        <div className="w-full aspect-video rounded border border-border overflow-hidden">
          <NodeImageThumb
            projectId={projectId}
            src={src}
            assetPath={assetPath}
            alt={label}
            className="w-full h-full object-cover"
            placeholder="…"
          />
        </div>
      ) : (
        <div className="w-full aspect-video rounded border border-dashed border-border/50 flex items-center justify-center">
          <span className="text-[8px] text-text-muted text-center px-1">{emptyHint}</span>
        </div>
      )}
    </div>
  )
}

function VideoNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const uploadMedia = useNodeMediaUpload(id, 'video')
  const addNode = useCanvasStore((s) => s.addNode)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [pendingPreview, setPendingPreview] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const videoAssetPath =
    typeof data.videoAssetPath === 'string' ? data.videoAssetPath : undefined
  const inlineVideoSrc = typeof data.videoSrc === 'string' ? data.videoSrc : undefined
  const hasVideo = !!(inlineVideoSrc || videoAssetPath)

  const { src: mediaSrc, loading: mediaLoading, load: loadMedia } = useLazyAssetBlob(
    projectId,
    videoAssetPath,
    inlineVideoSrc,
  )

  useEffect(() => {
    setVideoError(false)
    setIsPlaying(false)
    setAutoPlay(false)
    setPendingPreview(false)
  }, [videoAssetPath, inlineVideoSrc])

  useEffect(() => {
    if (autoPlay && mediaSrc && videoRef.current) {
      void videoRef.current.play()
      setAutoPlay(false)
    }
  }, [autoPlay, mediaSrc])

  useEffect(() => {
    if (pendingPreview && mediaSrc) {
      setShowPreview(true)
      setPendingPreview(false)
    }
  }, [pendingPreview, mediaSrc])

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  const handleTrim = useCallback(
    async (start: number, end: number) => {
      if (!projectId || !data.videoAssetPath) {
        handleError(new Error('请先保存视频到项目资产'), 'trim')
        return
      }
      try {
        const absoluteInput = await resolveAssetAbsolutePath(
          projectId,
          data.videoAssetPath as string,
        )
        const trimmed = await trimVideoAsset(projectId, absoluteInput, start, end)
        const currentNode = useCanvasStore.getState().nodes.find((n) => n.id === id)
        addNode({
          id: generateNodeId('video'),
          type: 'video',
          position: {
            x: (currentNode?.position.x ?? 0) + 40,
            y: (currentNode?.position.y ?? 0) + 40,
          },
          width: 280,
          height: 360,
          data: {
            videoAssetPath: trimmed.relativePath,
            videoSrc: trimmed.blobUrl,
            fileName: `trim-${start.toFixed(1)}-${end.toFixed(1)}.mp4`,
            duration: end - start,
          },
        })
        setShowPreview(false)
      } catch (error) {
        handleError(error, 'trim')
      }
    },
    [projectId, data.videoAssetPath, addNode, id],
  )

  const prompt = typeof data.prompt === 'string' ? data.prompt : ''
  const firstFrame = typeof data.firstFrameSrc === 'string' ? data.firstFrameSrc : undefined
  const lastFrame = typeof data.lastFrameSrc === 'string' ? data.lastFrameSrc : undefined
  const firstFrameAssetPath =
    typeof data.firstFrameAssetPath === 'string' ? data.firstFrameAssetPath : undefined
  const lastFrameAssetPath =
    typeof data.lastFrameAssetPath === 'string' ? data.lastFrameAssetPath : undefined
  const hasStoryboardFrame = !!(firstFrame || firstFrameAssetPath)
  const duration = typeof data.duration === 'number' ? data.duration : undefined
  const fileName = typeof data.fileName === 'string' ? data.fileName : undefined

  const handlePlayToggle = useCallback(async () => {
    if (videoError) return
    if (mediaSrc) {
      if (isPlaying) videoRef.current?.pause()
      else void videoRef.current?.play()
      return
    }
    const src = await loadMedia()
    if (!src) {
      setVideoError(true)
      return
    }
    setAutoPlay(true)
  }, [videoError, mediaSrc, loadMedia, isPlaying])

  const handleOpenPreview = useCallback(async () => {
    if (mediaSrc) {
      setShowPreview(true)
      return
    }
    const src = await loadMedia()
    if (!src) {
      setVideoError(true)
      return
    }
    setPendingPreview(true)
  }, [mediaSrc, loadMedia])

  return (
    <>
      <BaseNode
        color="var(--node-video)"
        icon={<span className="text-sm">🎥</span>}
        title="视频"
        selected={selected}
        width={width}
        height={height}
        defaultWidth={280}
        minWidth={240}
        minHeight={360}
        inputs={[
          { id: 'video', top: '14%' },
          { id: 'prompt', top: '32%' },
          { id: 'firstFrame', top: '50%' },
          { id: 'lastFrame', top: '66%' },
          { id: 'audio', top: '82%' },
        ]}
        outputs={[{ id: 'video', top: '50%' }]}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <div
            className="relative w-full h-[130px] shrink-0 bg-black/40 rounded overflow-hidden"
            onDoubleClick={() => hasVideo && void handleOpenPreview()}
          >
            {hasVideo ? (
              videoError ? (
                <div className="flex items-center justify-center h-full text-text-muted text-[10px] text-center px-2">
                  无法预览（编码不支持或文件缺失）
                </div>
              ) : mediaSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={mediaSrc}
                    className="w-full h-full object-contain"
                    preload="none"
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setVideoError(true)}
                    onLoadedMetadata={() => {
                      setVideoError(false)
                      const dur = videoRef.current?.duration
                      if (dur && !data.duration) {
                        updateNodeData(id, { duration: dur })
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/40 transition nodrag"
                    onClick={() => void handlePlayToggle()}
                  >
                    <span className="text-xl text-white">{isPlaying ? '⏸' : '▶'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="flex flex-col items-center justify-center w-full h-full text-text-muted text-xs nodrag"
                  onClick={() => void handlePlayToggle()}
                >
                  <span className="text-2xl mb-1">{mediaLoading ? '⏳' : '▶'}</span>
                  {mediaLoading ? '加载中…' : '点击加载预览'}
                </button>
              )
            ) : hasStoryboardFrame ? (
              <div className="relative w-full h-full">
                <NodeImageThumb
                  projectId={projectId}
                  src={firstFrame}
                  assetPath={firstFrameAssetPath}
                  alt="分镜首帧"
                  className="w-full h-full object-contain opacity-90"
                  placeholder="🖼️"
                />
                <div className="absolute bottom-1 left-1 text-[8px] bg-black/50 text-white/80 px-1 rounded">
                  分镜首帧 · 选中后在下方生成视频
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex flex-col items-center justify-center w-full h-full text-text-muted text-xs nodrag"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-2xl mb-1">🎬</span>
                上传或接入视频
              </button>
            )}
          </div>

          <div className="flex gap-1.5 shrink-0">
            <FrameSlot
              label="首帧"
              projectId={projectId}
              src={firstFrame}
              assetPath={firstFrameAssetPath}
              emptyHint="接图片"
            />
            <FrameSlot
              label="尾帧"
              projectId={projectId}
              src={lastFrame}
              assetPath={lastFrameAssetPath}
              emptyHint="接图片"
            />
            <div className="flex-[1.2] min-w-0 flex flex-col rounded border border-border bg-bg-tertiary/40 p-1.5">
              <span className="text-[9px] text-text-muted shrink-0">提示 / 脚本</span>
              {prompt ? (
                <p className="text-[10px] text-text-primary line-clamp-3 break-all flex-1 mt-0.5" title={prompt}>
                  {prompt}
                </p>
              ) : (
                <p className="text-[10px] text-text-muted italic mt-0.5">连接文本或脚本</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasVideo && (
              <button
                type="button"
                onClick={() => void handleOpenPreview()}
                className="flex-1 text-[10px] py-1 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-primary nodrag"
              >
                🔍 预览 / 裁取
              </button>
            )}
            <span className="text-[9px] text-text-muted truncate shrink-0">
              {duration ? `${duration.toFixed(1)}s` : ''}
              {fileName ? ` · ${fileName}` : ''}
            </span>
          </div>

          {data.isGenerating === true && (
            <div className="shrink-0 w-full bg-bg-tertiary rounded-full h-1">
              <div
                className="bg-rose-500 h-1 rounded-full transition-all"
                style={{ width: `${(data.progress as number) || 0}%` }}
              />
            </div>
          )}

          <div className="flex-1 min-h-[4px]" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) loadFile(file)
          }}
        />
      </BaseNode>

      {showPreview && mediaSrc && (
        <VideoPreview
          src={mediaSrc}
          onClose={() => setShowPreview(false)}
          onTrim={data.videoAssetPath ? handleTrim : undefined}
        />
      )}
    </>
  )
}

export const VideoNode = memo(VideoNodeComponent)
