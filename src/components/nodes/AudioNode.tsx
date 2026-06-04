import { memo, useCallback, useRef } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'

function AudioNodeComponent({ id, data, selected }: NodeProps) {
  const uploadMedia = useNodeMediaUpload(id, 'audio')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  return (
    <BaseNode
      color="var(--node-audio)"
      icon={<span className="text-sm">🎵</span>}
      title="音频"
      selected={selected}
      width={200}
    >
      <div
        className="w-[160px] h-[60px] bg-bg-tertiary rounded flex items-center justify-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {data.audioSrc ? (
          <div className="flex items-center gap-2 text-green-300 text-xs px-2">
            <span>🎵</span>
            <span className="truncate max-w-[100px]">{String(data.fileName || '音频')}</span>
          </div>
        ) : (
          <div className="text-text-muted text-xs text-center">点击上传音频</div>
        )}
      </div>

      {data.audioSrc && (
        <audio src={data.audioSrc as string} controls className="mt-2 w-full h-8 nodrag" />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadFile(file)
        }}
      />

      <Handle type="source" position={Position.Right} id="audio"
        style={{ top: '50%', background: 'var(--node-audio)', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const AudioNode = memo(AudioNodeComponent)
