import { memo, useCallback, useRef, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PortHandle } from './PortHandle'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useProjectStore } from '../../stores/projectStore'
import { nodeDisplayTitle } from '../../utils/nodeNaming'

function AudioNodeComponent({ id, data, selected }: NodeProps) {
  const uploadMedia = useNodeMediaUpload(id, 'audio')
  const projectId = useProjectStore((s) => s.currentProjectId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPlayer, setShowPlayer] = useState(false)

  const audioAssetPath =
    typeof data.audioAssetPath === 'string' ? data.audioAssetPath : undefined
  const inlineAudioSrc = typeof data.audioSrc === 'string' ? data.audioSrc : undefined
  const hasAudio = !!(inlineAudioSrc || audioAssetPath)

  const { src: mediaSrc, loading, load: loadMedia } = useLazyAssetBlob(
    projectId,
    audioAssetPath,
    inlineAudioSrc,
  )

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  const handleShowPlayer = useCallback(async () => {
    if (mediaSrc) {
      setShowPlayer(true)
      return
    }
    const src = await loadMedia()
    if (src) setShowPlayer(true)
  }, [mediaSrc, loadMedia])

  return (
    <BaseNode
      nodeId={id}
      color="var(--node-audio)"
      icon={<span className="text-sm">🎵</span>}
      title={nodeDisplayTitle({ type: 'audio', data }, '音频')}
      selected={selected}
      width={200}
    >
      <div
        className="w-[160px] h-[60px] bg-bg-tertiary rounded flex items-center justify-center cursor-pointer"
        onClick={() => {
          if (hasAudio) void handleShowPlayer()
          else fileInputRef.current?.click()
        }}
      >
        {hasAudio ? (
          <div className="flex items-center gap-2 text-green-300 text-xs px-2">
            <span>🎵</span>
            <span className="truncate max-w-[100px]">
              {loading ? '加载中…' : String(data.fileName || '点击播放')}
            </span>
          </div>
        ) : (
          <div className="text-text-muted text-xs text-center">点击上传音频</div>
        )}
      </div>

      {showPlayer && mediaSrc && (
        <audio src={mediaSrc} controls autoPlay className="mt-2 w-full h-8 nodrag" preload="none" />
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

      <PortHandle id="audio" type="source" color="var(--node-audio)" top="50%" />
    </BaseNode>
  )
}

export const AudioNode = memo(AudioNodeComponent)
