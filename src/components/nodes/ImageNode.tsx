import { memo, useRef, useCallback } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

function ImageNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        updateNodeData(id, { imageSrc: reader.result as string, fileName: file.name })
      }
      reader.readAsDataURL(file)
    },
    [id, updateNodeData],
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
      width={220}
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
        <p className="mt-1 text-[10px] text-text-muted truncate">提示: {data.prompt}</p>
      )}

      <button
        type="button"
        disabled
        className="mt-2 w-full text-xs bg-cyan-600/30 text-cyan-300 py-1 rounded opacity-50 cursor-not-allowed"
      >
        ✨ 生成 (v2)
      </button>

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

      <Handle type="target" position={Position.Left} id="prompt"
        style={{ top: '28%', background: 'var(--node-image)', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="reference"
        style={{ top: '52%', background: 'var(--node-image)', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="reference"
        style={{ top: '28%', background: 'var(--node-image)', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="firstFrame"
        style={{ top: '52%', background: 'var(--node-image)', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="lastFrame"
        style={{ top: '76%', background: 'var(--node-image)', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const ImageNode = memo(ImageNodeComponent)
