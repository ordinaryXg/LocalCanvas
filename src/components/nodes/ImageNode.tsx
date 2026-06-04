import { memo, useRef, useCallback } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
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

  const prompt = typeof data.prompt === 'string' ? data.prompt : ''
  const hasReference = typeof data.referenceSrc === 'string' && data.referenceSrc.length > 0

  return (
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
      inputs={[
        { id: 'prompt', top: '24%' },
        { id: 'reference', top: '48%' },
      ]}
      outputs={[
        { id: 'reference', top: '24%' },
        { id: 'firstFrame', top: '48%' },
        { id: 'lastFrame', top: '72%' },
      ]}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-2">
        <div
          className="w-full h-[140px] shrink-0 bg-bg-tertiary rounded flex items-center justify-center cursor-pointer overflow-hidden"
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          {data.imageSrc ? (
            <img
              src={data.imageSrc as string}
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

        {data.isGenerating === true && (
          <div className="shrink-0 w-full bg-bg-tertiary rounded-full h-1">
            <div
              className="bg-cyan-500 h-1 rounded-full transition-all"
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
  )
}

export const ImageNode = memo(ImageNodeComponent)
