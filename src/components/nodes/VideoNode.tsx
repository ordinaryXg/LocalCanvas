import { memo, useRef, useCallback, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

function VideoNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file)
      updateNodeData(id, { videoSrc: url, fileName: file.name })
    },
    [id, updateNodeData],
  )

  return (
    <BaseNode
      color="var(--node-video)"
      icon={<span className="text-sm">🎥</span>}
      title="视频"
      selected={selected}
      width={230}
    >
      <div className="w-[200px] h-[120px] bg-bg-tertiary rounded relative overflow-hidden">
        {data.videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={data.videoSrc as string}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition nodrag"
              onClick={() => {
                if (isPlaying) videoRef.current?.pause()
                else void videoRef.current?.play()
              }}
            >
              <span className="text-2xl text-white">{isPlaying ? '⏸' : '▶'}</span>
            </button>
          </>
        ) : (
          <div
            className="flex items-center justify-center h-full text-text-muted text-xs text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div>
              <div className="text-2xl mb-1">🎬</div>
              拖入或上传视频
            </div>
          </div>
        )}
      </div>

      {data.isGenerating && (
        <div className="mt-2 w-full bg-bg-tertiary rounded-full h-1.5">
          <div
            className="bg-rose-500 h-1.5 rounded-full transition-all"
            style={{ width: `${(data.progress as number) || 0}%` }}
          />
        </div>
      )}

      <button
        type="button"
        disabled
        className="mt-2 w-full text-xs bg-rose-600/30 text-rose-300 py-1 rounded opacity-50 cursor-not-allowed"
      >
        ✨ 生成 (v2)
      </button>

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

      <Handle type="target" position={Position.Left} id="prompt"
        style={{ top: '18%', background: 'var(--node-video)', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="firstFrame"
        style={{ top: '38%', background: 'var(--node-video)', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="lastFrame"
        style={{ top: '58%', background: 'var(--node-video)', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="audio"
        style={{ top: '78%', background: 'var(--node-video)', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="video"
        style={{ top: '50%', background: 'var(--node-video)', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const VideoNode = memo(VideoNodeComponent)
