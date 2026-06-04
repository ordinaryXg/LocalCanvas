import { useEffect, useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { ImageGenerator } from './ImageGenerator'
import { VideoGenerator } from './VideoGenerator'
import { TextGenerator } from './TextGenerator'
import { ScriptGenerator } from './ScriptGenerator'
import { AudioGenerator } from './AudioGenerator'

const GENERATOR_NODE_TYPES = new Set(['text', 'image', 'video', 'audio', 'script'])

export function GeneratorPanel() {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const nodes = useCanvasStore((s) => s.nodes)
  const [collapsed, setCollapsed] = useState(false)

  const timelineOpen = nodes.some((n) => n.type === 'compose' && n.data.showTimeline)

  const selectedNode = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && GENERATOR_NODE_TYPES.has(n.type ?? ''),
  )

  useEffect(() => {
    if (selectedNode) setCollapsed(false)
  }, [selectedNode?.id])

  if (timelineOpen || !selectedNode || collapsed) return null

  const labels: Record<string, string> = {
    text: '📝 文本生成器',
    image: '🖼️ 图像生成器',
    video: '🎥 视频生成器',
    audio: '🎵 音频生成器',
    script: '🎬 脚本生成器',
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div className="bg-bg-secondary/95 backdrop-blur border-t border-border px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">{labels[selectedNode.type ?? '']}</span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-text-muted hover:text-white text-xs"
          >
            收起 ▼
          </button>
        </div>

        {selectedNode.type === 'text' && <TextGenerator nodeId={selectedNode.id} />}
        {selectedNode.type === 'image' && <ImageGenerator nodeId={selectedNode.id} />}
        {selectedNode.type === 'video' && <VideoGenerator nodeId={selectedNode.id} />}
        {selectedNode.type === 'audio' && <AudioGenerator nodeId={selectedNode.id} />}
        {selectedNode.type === 'script' && <ScriptGenerator nodeId={selectedNode.id} />}
      </div>
    </div>
  )
}
