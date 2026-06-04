import { memo, useRef, useCallback, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PortHandle } from './PortHandle'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'

function VideoNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const uploadMedia = useNodeMediaUpload(id, 'video')
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  return (
    <BaseNode
      color="var(--node-video)"
      icon={<span className="text-sm">🎥</span>}
      title="视频"
      selected={selected}
      width={width}
      height={height}
      defaultWidth={230}
      minWidth={180}
      minHeight={120}
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

      {(typeof data.firstFrameSrc === 'string' || typeof data.lastFrameSrc === 'string') && (
        <div className="mt-2 flex items-center gap-2">
          {typeof data.firstFrameSrc === 'string' && data.firstFrameSrc.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted">首帧</span>
              <img
                src={data.firstFrameSrc}
                alt="首帧"
                className="w-10 h-10 object-cover rounded border border-border"
              />
            </div>
          )}
          {typeof data.lastFrameSrc === 'string' && data.lastFrameSrc.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted">尾帧</span>
              <img
                src={data.lastFrameSrc}
                alt="尾帧"
                className="w-10 h-10 object-cover rounded border border-border"
              />
            </div>
          )}
        </div>
      )}

      {typeof data.prompt === 'string' && data.prompt.length > 0 && (
        <p className="mt-1 text-[10px] text-text-muted line-clamp-2 break-all" title={data.prompt}>
          提示: {data.prompt}
        </p>
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

      <PortHandle id="prompt" type="target" color="var(--node-video)" top="18%" />
      <PortHandle id="firstFrame" type="target" color="var(--node-video)" top="38%" />
      <PortHandle id="lastFrame" type="target" color="var(--node-video)" top="58%" />
      <PortHandle id="audio" type="target" color="var(--node-video)" top="78%" />
      <PortHandle id="video" type="source" color="var(--node-video)" top="50%" />
    </BaseNode>
  )
}

export const VideoNode = memo(VideoNodeComponent)
