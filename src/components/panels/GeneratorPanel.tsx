import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { ImageGenerator } from './ImageGenerator'
import { VideoGenerator } from './VideoGenerator'
import { TextEditorPanel } from '../text/TextEditorPanel'
import { ScriptGenerator } from './ScriptGenerator'
import { AudioGenerator } from './AudioGenerator'
import { StoryboardGenerator } from './StoryboardGenerator'

const GENERATOR_NODE_TYPES = new Set(['text', 'image', 'video', 'audio', 'script', 'storyboard'])

const MIN_PANEL_HEIGHT = 160
const DEFAULT_PANEL_HEIGHT = 280
const DEFAULT_TEXT_PANEL_HEIGHT = 400
const MAX_PANEL_HEIGHT_RATIO = 0.78

export function GeneratorPanel() {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const nodes = useCanvasStore((s) => s.nodes)
  const [collapsed, setCollapsed] = useState(false)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const selectedNode = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && GENERATOR_NODE_TYPES.has(n.type ?? ''),
  )

  useEffect(() => {
    if (selectedNode) {
      setCollapsed(false)
      if (selectedNode.type === 'text') {
        setPanelHeight((h) => Math.max(h, DEFAULT_TEXT_PANEL_HEIGHT))
      }
    }
  }, [selectedNode?.id, selectedNode?.type])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = resizeRef.current.startY - event.clientY
      const maxHeight = window.innerHeight * MAX_PANEL_HEIGHT_RATIO
      const next = Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, resizeRef.current.startHeight + delta))
      setPanelHeight(next)
    }

    const onMouseUp = () => {
      resizeRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const startResize = (event: ReactMouseEvent) => {
    event.preventDefault()
    resizeRef.current = { startY: event.clientY, startHeight: panelHeight }
  }

  if (!selectedNode || collapsed) return null

  const labels: Record<string, string> = {
    text: '📝 文本编辑',
    image: '🖼️ 图像生成器',
    video: '🎥 视频生成器',
    audio: '🎵 音频生成器',
    script: '🎬 脚本生成器',
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div
        className="pointer-events-auto bg-bg-secondary/95 backdrop-blur border-t border-border flex flex-col overflow-hidden shadow-[0_-8px_24px_rgba(0,0,0,0.25)]"
        style={{ height: panelHeight }}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="调整面板高度"
          title="拖动调整高度"
          onMouseDown={startResize}
          className="group h-2 shrink-0 cursor-ns-resize flex items-center justify-center border-b border-transparent hover:border-accent/30 hover:bg-accent/5"
        >
          <span className="w-10 h-1 rounded-full bg-border group-hover:bg-accent/60 transition-colors" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto lc-scroll px-6 py-3">
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

          {selectedNode.type === 'text' && <TextEditorPanel nodeId={selectedNode.id} />}
          {selectedNode.type === 'image' && <ImageGenerator nodeId={selectedNode.id} />}
          {selectedNode.type === 'video' && <VideoGenerator nodeId={selectedNode.id} />}
          {selectedNode.type === 'audio' && <AudioGenerator nodeId={selectedNode.id} />}
          {selectedNode.type === 'script' && <ScriptGenerator nodeId={selectedNode.id} />}
          {selectedNode.type === 'storyboard' && <StoryboardGenerator nodeId={selectedNode.id} />}
        </div>
      </div>
    </div>
  )
}
