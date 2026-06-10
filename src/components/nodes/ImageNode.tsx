import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { IMAGE_UNIFIED_INPUT_HANDLE } from '../../capabilities/image-inbound-handle'
import { getImageNodePorts } from '../../capabilities/node-port-ui'
import { useOpenGeneratorDrawer } from '../inspector/useOpenGeneratorDrawer'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import {
  CANVAS_NODE_SHELL_PAD,
  computeImageDisplaySize,
  IMAGE_CANVAS_EMPTY_HEIGHT,
  IMAGE_CANVAS_EMPTY_WIDTH,
  IMAGE_CANVAS_MAX_HEIGHT,
  IMAGE_CANVAS_MIN_HEIGHT,
  IMAGE_CANVAS_MIN_WIDTH,
} from '../../utils/imageNodeDisplay'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'

function ImageNodeComponent({ id, data, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMedia = useNodeMediaUpload(id, 'image')
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const edges = useCanvasStore((s) => s.edges)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { openDrawer } = useOpenGeneratorDrawer(id)
  const modelId = typeof data.modelId === 'string' ? data.modelId : undefined
  const variant = useMemo(() => getNodeVisualVariant(id), [id])

  const [displaySize, setDisplaySize] = useState({
    width: IMAGE_CANVAS_EMPTY_WIDTH,
    height: IMAGE_CANVAS_EMPTY_HEIGHT,
    clipped: false,
  })

  const hiddenInputHandles = useMemo(() => {
    const fromModel = getImageNodePorts(modelId).map((p) => p.id)
    const fromEdges = edges
      .filter(
        (e) =>
          e.target === id &&
          e.targetHandle &&
          e.targetHandle !== IMAGE_UNIFIED_INPUT_HANDLE,
      )
      .map((e) => e.targetHandle as string)
    return [...new Set([...fromModel, ...fromEdges])]
  }, [edges, id, modelId])

  const imageAssetPath =
    typeof data.imageAssetPath === 'string' ? data.imageAssetPath : undefined
  const inlineImageSrc = typeof data.imageSrc === 'string' ? data.imageSrc : undefined
  const hasImage = !!(inlineImageSrc || imageAssetPath)
  const isGenerating = data.isGenerating === true
  const errorMessage = typeof data.error === 'string' ? data.error : undefined

  const { src: mediaSrc, loading: mediaLoading } = useLazyAssetBlob(
    projectId,
    imageAssetPath,
    inlineImageSrc,
  )

  const imageSrc = mediaSrc ?? inlineImageSrc

  useEffect(() => {
    if (!imageSrc) return
    const probe = new Image()
    probe.onload = () => {
      setDisplaySize(computeImageDisplaySize(probe.naturalWidth, probe.naturalHeight))
    }
    probe.src = imageSrc
  }, [imageSrc])

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

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setDisplaySize(computeImageDisplaySize(img.naturalWidth, img.naturalHeight))
  }, [])

  useEffect(() => {
    if (!imageSrc) {
      setDisplaySize({
        width: IMAGE_CANVAS_EMPTY_WIDTH,
        height: IMAGE_CANVAS_EMPTY_HEIGHT,
        clipped: false,
      })
    }
  }, [imageSrc])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.max(
          IMAGE_CANVAS_MIN_WIDTH,
          Math.ceil(shell.offsetWidth),
        )
        const measuredHeight = Math.min(
          IMAGE_CANVAS_MAX_HEIGHT + CANVAS_NODE_SHELL_PAD * 2,
          Math.max(IMAGE_CANVAS_MIN_HEIGHT, Math.ceil(shell.offsetHeight)),
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
  }, [displaySize, id, imageSrc, updateNodeSize])

  const openEditor = () => {
    openDrawer()
  }

  const showEmpty = !imageSrc
  const frameWidth = hasImage && imageSrc ? displaySize.width : IMAGE_CANVAS_EMPTY_WIDTH
  const frameHeight = hasImage && imageSrc ? displaySize.height : IMAGE_CANVAS_EMPTY_HEIGHT

  return (
    <>
      <div ref={shellRef} className="image-node-shell">
        <div
          className={`image-node-frame ${selected ? 'image-node-frame--selected' : ''} ${
            showEmpty ? 'image-node-frame--empty' : ''
          } ${errorMessage ? 'image-node-frame--error' : ''}`}
          style={{
            borderRadius: variant.borderRadius,
            width: frameWidth,
            height: frameHeight,
          }}
          onDoubleClick={openEditor}
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            if (!showEmpty) return
            if (!selected) return
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          title={
            errorMessage ??
            (hasImage
              ? '双击在编辑台编辑'
              : selected
                ? '点击上传本地图片，或拖入图片'
                : '选中后点击上传，或拖入图片')
          }
        >
          {imageSrc ? (
            <div className="image-node__media">
              <img
                src={imageSrc}
                alt=""
                className="image-node__img"
                style={{ objectFit: displaySize.clipped ? 'cover' : 'contain' }}
                onLoad={handleImageLoad}
                draggable={false}
              />
              {displaySize.clipped && <div className="image-node__fade" aria-hidden />}
            </div>
          ) : (
            <div className="image-node__placeholder" aria-hidden>
              <span className="media-node__empty-icon">🖼️</span>
            </div>
          )}

          {(mediaLoading || isGenerating) && (
            <div className="image-node__overlay" aria-hidden>
              <div className="image-node__spinner" />
            </div>
          )}

          <Handle
            type="target"
            position={Position.Left}
            id={IMAGE_UNIFIED_INPUT_HANDLE}
            className="image-node__handle"
            style={{ top: '50%' }}
          />
          {hiddenInputHandles.map((handleId) => (
            <Handle
              key={`hidden-in-${handleId}`}
              type="target"
              position={Position.Left}
              id={handleId}
              className="image-node__handle image-node__handle--hidden"
              style={{ top: '50%' }}
            />
          ))}
          <Handle
            type="source"
            position={Position.Right}
            id="image"
            className="image-node__handle"
            style={{ top: '50%' }}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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

export const ImageNode = memo(ImageNodeComponent)
