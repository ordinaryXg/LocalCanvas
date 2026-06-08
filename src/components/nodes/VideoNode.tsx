import { memo, useRef, useCallback, useMemo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { getVideoNodePorts } from '../../capabilities/node-port-ui'
import { applyPortSlotLabels, getVideoPortSlotLabels } from '../../capabilities/port-slot-labels'
import { listVideoReferenceHandles } from '../../utils/videoReferenceSlots'
import { getStylePreset } from '../../constants/stylePresets'
import { nodeDisplayTitle } from '../../utils/nodeNaming'

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
  const edges = useCanvasStore((s) => s.edges)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const videoAssetPath =
    typeof data.videoAssetPath === 'string' ? data.videoAssetPath : undefined
  const inlineVideoSrc = typeof data.videoSrc === 'string' ? data.videoSrc : undefined
  const hasVideo = !!(inlineVideoSrc || videoAssetPath)
  const modelId = typeof data.modelId === 'string' ? data.modelId : undefined

  const inputPorts = useMemo(() => {
    const inbound = edges.filter((e) => e.target === id && e.targetHandle)
    const slotDisabled: Partial<Record<string, boolean>> = {}
    for (const handle of ['video', 'firstFrame', 'lastFrame', 'audio'] as const) {
      if (inbound.some((e) => e.targetHandle === handle)) {
        slotDisabled[handle] = true
      }
    }
    for (const handle of listVideoReferenceHandles(9)) {
      if (inbound.some((e) => e.targetHandle === handle)) {
        slotDisabled[handle] = true
      }
    }
    const ports = getVideoNodePorts(modelId, undefined, slotDisabled)
    const labels = getVideoPortSlotLabels(id, edges, modelId)
    return applyPortSlotLabels(ports, labels)
  }, [edges, id, modelId])

  const { src: mediaSrc, loading: mediaLoading } = useLazyAssetBlob(
    projectId,
    videoAssetPath,
    inlineVideoSrc,
  )

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  const prompt = typeof data.prompt === 'string' ? data.prompt : ''
  const firstFrame = typeof data.firstFrameSrc === 'string' ? data.firstFrameSrc : undefined
  const lastFrame = typeof data.lastFrameSrc === 'string' ? data.lastFrameSrc : undefined
  const firstFrameAssetPath =
    typeof data.firstFrameAssetPath === 'string' ? data.firstFrameAssetPath : undefined
  const lastFrameAssetPath =
    typeof data.lastFrameAssetPath === 'string' ? data.lastFrameAssetPath : undefined
  const hasStoryboardFrame = !!(firstFrame || firstFrameAssetPath)
  const displayTitle = nodeDisplayTitle({ type: 'video', data }, '视频')
  const styleId = typeof data.styleId === 'string' ? data.styleId : ''
  const stylePreset = styleId ? getStylePreset(styleId) : undefined
  const posterSrc = mediaSrc ?? inlineVideoSrc

  return (
    <BaseNode
      nodeId={id}
      color="var(--node-video)"
      icon={<span className="text-sm">🎥</span>}
      title={displayTitle}
      selected={selected}
      width={width}
      height={height}
      badge={stylePreset ? stylePreset.name : undefined}
      defaultWidth={240}
      minWidth={200}
      minHeight={280}
      inputs={inputPorts}
      outputs={[{ id: 'video', top: '50%' }]}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-2">
        <div
          className="w-full flex-1 min-h-[80px] bg-bg-tertiary rounded flex items-center justify-center cursor-pointer overflow-hidden relative"
          onClick={() => fileInputRef.current?.click()}
        >
          {hasVideo && posterSrc ? (
            <video
              src={posterSrc}
              className="w-full h-full object-contain pointer-events-none"
              preload="metadata"
              muted
              playsInline
            />
          ) : hasStoryboardFrame ? (
            <NodeImageThumb
              projectId={projectId}
              src={firstFrame}
              assetPath={firstFrameAssetPath}
              alt="分镜首帧"
              className="w-full h-full object-contain opacity-90"
              placeholder="🖼️"
            />
          ) : hasVideo && mediaLoading ? (
            <span className="text-text-muted text-xs">加载中…</span>
          ) : (
            <div className="text-text-muted text-xs text-center">
              <div className="text-2xl mb-1">🎬</div>
              拖入或点击上传
            </div>
          )}
          {hasVideo && (
            <div className="absolute bottom-1 right-1 text-[8px] bg-black/50 text-white/80 px-1 rounded pointer-events-none">
              下方编辑器预览
            </div>
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
            <span className="text-[9px] text-text-muted shrink-0">画面描述</span>
            {prompt ? (
              <p className="text-[10px] text-text-primary line-clamp-2 break-all flex-1 mt-0.5" title={prompt}>
                {prompt}
              </p>
            ) : (
              <p className="text-[10px] text-text-muted italic mt-0.5">连接文本或脚本</p>
            )}
          </div>
        </div>

        {data.isGenerating === true && (
          <div className="shrink-0 w-full bg-bg-tertiary rounded-full h-1">
            <div
              className="bg-[var(--node-video)] h-1 rounded-full transition-all"
              style={{ width: `${(data.progress as number) || 0}%` }}
            />
          </div>
        )}

        {typeof data.error === 'string' && (
          <p className="shrink-0 text-[10px] text-danger line-clamp-2">{data.error}</p>
        )}

        <div className="flex-1 min-h-[8px]" />
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
  )
}

export const VideoNode = memo(VideoNodeComponent)
