import { memo, useRef, useCallback } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PortHandle } from './PortHandle'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'

function ImageNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const uploadMedia = useNodeMediaUpload(id, 'image')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <BaseNode
      color="var(--node-image)"
      icon={<span className="text-sm">🖼️</span>}
      title="图片"
      selected={selected}
      width={width}
      height={height}
      defaultWidth={220}
      minWidth={180}
      minHeight={120}
    >
      <div
        className="w-[180px] h-[120px] bg-bg-tertiary rounded flex items-center justify-center cursor-pointer"
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        {data.imageSrc ? (
          <img
            src={data.imageSrc as string}
            alt=""
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="text-text-muted text-xs text-center">
            <div className="text-2xl mb-1">📁</div>
            拖入或点击上传
          </div>
        )}
      </div>

      {typeof data.prompt === 'string' && data.prompt.length > 0 && (
        <p className="mt-1 text-[10px] text-text-muted line-clamp-2 break-all" title={data.prompt}>
          提示: {data.prompt}
        </p>
      )}

      {typeof data.referenceSrc === 'string' && data.referenceSrc.length > 0 && (
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[10px] text-text-muted">参考图</span>
          <img
            src={data.referenceSrc}
            alt=""
            className="w-8 h-8 object-cover rounded border border-border"
          />
        </div>
      )}

      {data.isGenerating === true && (
        <div className="mt-2 w-full bg-bg-tertiary rounded-full h-1">
          <div
            className="bg-cyan-500 h-1 rounded-full transition-all"
            style={{ width: `${(data.progress as number) || 0}%` }}
          />
        </div>
      )}

      {typeof data.error === 'string' && (
        <p className="mt-1 text-[10px] text-danger truncate">{data.error}</p>
      )}

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

      <PortHandle id="prompt" type="target" color="var(--node-image)" top="28%" />
      <PortHandle id="reference" type="target" color="var(--node-image)" top="52%" />
      <PortHandle id="reference" type="source" color="var(--node-image)" top="28%" />
      <PortHandle id="firstFrame" type="source" color="var(--node-image)" top="52%" />
      <PortHandle id="lastFrame" type="source" color="var(--node-image)" top="76%" />
    </BaseNode>
  )
}

export const ImageNode = memo(ImageNodeComponent)
