import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { GENERATABLE_NODE_TYPES } from '../../constants/editorFeatures'
import { GeneratorContent } from '../panels/GeneratorContent'

const MIN_HEIGHT = 160

interface GeneratorDrawerProps {
  containerRef: RefObject<HTMLElement | null>
}

export function GeneratorDrawer({ containerRef }: GeneratorDrawerProps) {
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const open = useEditorShellStore((s) => s.generatorDrawerOpen)
  const setOpen = useEditorShellStore((s) => s.setGeneratorDrawerOpen)
  const heightRatio = useEditorShellStore((s) => s.generatorDrawerHeightRatio)
  const setHeightRatio = useEditorShellStore((s) => s.setGeneratorDrawerHeightRatio)
  const mode = useEditorShellStore((s) => s.mode)

  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const prevSelectedIdRef = useRef<string | null>(null)
  const [containerHeight, setContainerHeight] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerHeight(Math.max(MIN_HEIGHT, el.clientHeight))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current || containerHeight <= 0) return
      const delta = resizeRef.current.startY - event.clientY
      const nextPx = resizeRef.current.startHeight + delta
      setHeightRatio(nextPx / containerHeight)
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
  }, [containerHeight, setHeightRatio])

  const selectedNode = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && GENERATABLE_NODE_TYPES.has(n.type ?? ''),
  )

  useEffect(() => {
    if (mode !== 'canvas') return
    const id = selectedNode?.id ?? null
    if (id && id !== prevSelectedIdRef.current) {
      setOpen(true)
    }
    if (!id) {
      setOpen(false)
    }
    prevSelectedIdRef.current = id
  }, [selectedNode?.id, mode, setOpen, selectedNode])

  const nodeGenerating =
    selectedNode?.data &&
    typeof selectedNode.data === 'object' &&
    (selectedNode.data as Record<string, unknown>).isGenerating === true

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (drawerRef.current?.contains(e.target as Node)) return
      if (nodeGenerating) return
      setOpen(false)
    }
    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousedown', close)
    }
  }, [open, setOpen, nodeGenerating])

  if (!open || !selectedNode) return null

  const panelHeight = Math.max(MIN_HEIGHT, containerHeight * heightRatio)
  const nodeType = selectedNode.type ?? 'text'

  const startResize = (event: ReactMouseEvent) => {
    event.preventDefault()
    resizeRef.current = { startY: event.clientY, startHeight: panelHeight }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-[80] pointer-events-none">
      <div
        ref={drawerRef}
        className="generator-drawer-enter pointer-events-auto flex flex-col bg-bg-secondary/95 backdrop-blur border-t border-[var(--studio-border)] shadow-[0_-8px_24px_rgba(0,0,0,0.3)]"
        style={{ height: panelHeight }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="调整生成器高度"
          onMouseDown={startResize}
          className="group h-2 shrink-0 cursor-ns-resize flex items-center justify-center hover:bg-[var(--studio-accent-muted)]"
        >
          <span className="w-10 h-1 rounded-full bg-border group-hover:bg-[var(--studio-accent)]" />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto lc-scroll overscroll-contain px-4 py-3">
          <GeneratorContent nodeId={selectedNode.id} nodeType={nodeType} embedded={false} />
        </div>
      </div>
    </div>
  )
}
