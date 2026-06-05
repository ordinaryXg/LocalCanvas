import { memo, useRef, useCallback, useState, useMemo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { ImagePreview } from '../common/ImagePreview'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useProjectStore } from '../../stores/projectStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { getImageNodePorts } from '../../capabilities/node-port-ui'

function ImageNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const uploadMedia = useNodeMediaUpload(id, 'image')
  const edges = useCanvasStore((s) => s.edges)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const modelId = typeof data.modelId === 'string' ? data.modelId : undefined

  const inputPorts = useMemo(() => {
    const hasReferenceEdge = edges.some(
      (e) => e.target === id && e.targetHandle === 'reference',
    )
    return getImageNodePorts(modelId, undefined, {
      reference: hasReferenceEdge,
    })
  }, [edges, id, modelId])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPreview, setShowPreview] = useState(false)

  const imageAssetPath =
    typeof data.imageAssetPath === 'string' ? data.imageAssetPath : undefined
  const inlineImageSrc = typeof data.imageSrc === 'string' ? data.imageSrc : undefined
  const hasImage = !!(inlineImageSrc || imageAssetPath)

  const { src: mediaSrc, loading: mediaLoading, load: loadMedia } = useLazyAssetBlob(
    projectId,
    imageAssetPath,
    inlineImageSrc,
  )

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
      if (file?.type.startsWith('image/')) loadFile(file)
    },
    [loadFile],
  )

  const handleOpenPreview = useCallback(() => {
    if (!hasImage) return
    if (mediaSrc) {
      setShowPreview(true)
      return
    }
    void loadMedia().then((url) => {
      if (url) setShowPreview(true)
    })
  }, [hasImage, mediaSrc, loadMedia])

  const prompt = typeof data.prompt === 'string' ? data.prompt : ''
  const hasReference = typeof data.referenceSrc === 'string' && data.referenceSrc.length > 0
  const previewSrc = mediaSrc ?? inlineImageSrc
  const fileName = typeof data.fileName === 'string' ? data.fileName : '图片'

  return (
    <>
      <BaseNode
        color="var(--node-image)"
        icon={<span className="text-sm">🖼️</span>}
        title="图片"
        selected={selected}
        width={width}
        height={height}
        defaultWidth={240}
        minWidth={200}
        minHeight={280}
        inputs={inputPorts}
        outputs={[{ id: 'image', top: '50%' }]}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <div
            className="w-full h-[140px] shrink-0 bg-bg-tertiary rounded flex items-center justify-center cursor-pointer overflow-hidden"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {inlineImageSrc || mediaSrc ? (
              <img
                src={inlineImageSrc ?? mediaSrc}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-text-muted text-xs text-center">
                <div className="text-2xl mb-1">📁</div>
                拖入或点击上传
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <div className="flex-1 min-w-0 rounded border border-border bg-bg-tertiary/40 p-1.5">
              <div className="text-[9px] text-text-muted mb-0.5">提示词</div>
              {prompt ? (
                <p className="text-[10px] text-text-primary line-clamp-2 break-all" title={prompt}>
                  {prompt}
                </p>
              ) : (
                <p className="text-[10px] text-text-muted italic">连接文本/脚本</p>
              )}
            </div>
            <div className="w-14 shrink-0 rounded border border-border bg-bg-tertiary/40 p-1 flex flex-col items-center">
              <div className="text-[9px] text-text-muted mb-0.5">参考</div>
              {hasReference ? (
                <img
                  src={data.referenceSrc as string}
                  alt=""
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded border border-dashed border-border/60" />
              )}
            </div>
          </div>

          {hasImage && (
            <button
              type="button"
              onClick={() => void handleOpenPreview()}
              disabled={mediaLoading && !previewSrc}
              className="shrink-0 w-full text-[10px] py-1.5 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-primary nodrag disabled:opacity-50"
            >
              {mediaLoading && !previewSrc ? '加载中…' : '🔍 预览图片'}
            </button>
          )}

          {data.isGenerating === true && (
            <div className="shrink-0 w-full bg-bg-tertiary rounded-full h-1">
              <div
                className="bg-[var(--node-image)] h-1 rounded-full transition-all"
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
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) loadFile(file)
          }}
        />
      </BaseNode>

      {showPreview && previewSrc && (
        <ImagePreview
          src={previewSrc}
          title={fileName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}

export const ImageNode = memo(ImageNodeComponent)
