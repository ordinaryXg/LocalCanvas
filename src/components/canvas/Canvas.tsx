import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  BackgroundVariant,
  type Node,
  type Edge,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCanvasStore } from '../../stores/canvasStore'
import { TextNode } from '../nodes/TextNode'
import { ImageNode } from '../nodes/ImageNode'
import { VideoNode } from '../nodes/VideoNode'
import { AudioNode } from '../nodes/AudioNode'
import { ScriptNode } from '../nodes/ScriptNode'
import { ComposeNode } from '../nodes/ComposeNode'
import { StoryboardGroupNode } from '../nodes/StoryboardGroupNode'
import { useAgentStore } from '../../stores/agentStore'
import { ContextMenu, NodePicker, useContextMenuHandlers, type ContextMenuState } from './ContextMenu'
import { CanvasToolbar } from './CanvasToolbar'
import { GeneratorPanel } from '../panels/GeneratorPanel'
import { isPortCompatible, getNodeTypeFromId, isTargetHandleAvailable } from '../../utils/portCompat'
import { useDataFlow } from '../../hooks/useDataFlow'
import { useFileDrop, useSidebarNodeDrop, useAssetDrop, useKeyboardShortcuts } from '../../hooks/useKeyboard'
import { useAutoSave, useManualSave } from '../../hooks/useAutoSave'
import { generateNodeId } from '../../utils/id'
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from '../../utils/constants'
import { useDagRun } from '../../hooks/useDagRun'
import { DagRunPanel } from '../panels/DagRunPanel'
import { SlashCommandPalette } from './SlashCommandPalette'
import { useCanvasStore as getCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { showToast } from '../../utils/ErrorHandler'

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
  compose: ComposeNode,
  storyboard: StoryboardGroupNode,
}

function CanvasInner() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setViewport,
  } = useCanvasStore()

  const reactFlow = useReactFlow()
  const [zoom, setZoom] = useState(100)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodePicker, setNodePicker] = useState<{ x: number; y: number } | null>(null)
  const [middleMouseDown, setMiddleMouseDown] = useState(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 })
  const middleMouseDownRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const { runState, startRun, dismiss } = useDagRun()

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      middleMouseDownRef.current = true
      setMiddleMouseDown(true)
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 1) return
      middleMouseDownRef.current = false
      setMiddleMouseDown(false)
    }
    const reset = () => {
      middleMouseDownRef.current = false
      setMiddleMouseDown(false)
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', reset)

    const el = canvasRef.current
    const blockWheelZoomWhilePanning = (e: WheelEvent) => {
      if (!middleMouseDownRef.current) return
      e.preventDefault()
      e.stopPropagation()
    }
    el?.addEventListener('wheel', blockWheelZoomWhilePanning, { capture: true, passive: false })

    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', reset)
      el?.removeEventListener('wheel', blockWheelZoomWhilePanning, { capture: true })
    }
  }, [])

  const saveProject = useManualSave()
  useAutoSave()
  useDataFlow()
  useKeyboardShortcuts(saveProject)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === '/' && !slashOpen) {
        e.preventDefault()
        setSlashPos({ x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 80 })
        setSlashQuery('')
        setSlashOpen(true)
        return
      }

      if (slashOpen) {
        if (e.key === 'Backspace') {
          setSlashQuery((q) => q.slice(0, -1))
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setSlashQuery((q) => q + e.key)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slashOpen])

  const handleSlashSelect = useCallback(
    (cmd: { id: string }) => {
      setSlashOpen(false)
      if (cmd.id === 'agent') {
        useAgentStore.getState().setPanelOpen(true)
        return
      }
      if (cmd.id === 'grid3' || cmd.id === 'grid5') {
        const layout = cmd.id === 'grid3' ? 'grid3' : 'grid5'
        const store = getCanvasStore.getState()
        const targets = selectedNodeIds.length
          ? store.nodes.filter((n) => selectedNodeIds.includes(n.id) && n.type === 'storyboard')
          : store.nodes.filter((n) => n.type === 'storyboard')
        for (const n of targets) {
          store.updateNodeData(n.id, { layout })
        }
        return
      }
      if (cmd.id === 'run') {
        const ids =
          selectedNodeIds.length > 0
            ? selectedNodeIds
            : getCanvasStore.getState().nodes.map((n) => n.id)
        void startRun(ids)
        return
      }
      if (cmd.id === 'exportStoryboard') {
        const store = getCanvasStore.getState()
        const projectId = useProjectStore.getState().currentProjectId
        const targets = selectedNodeIds.length
          ? store.nodes.filter((n) => selectedNodeIds.includes(n.id) && n.type === 'storyboard')
          : store.nodes.filter((n) => n.type === 'storyboard')
        const target = targets[0]
        if (!target || !projectId) return
        const frames = (target.data.frames as Array<{
          sequence: number
          description: string
          imagePath?: string
        }>) ?? []
        if (frames.length === 0) return
        void window.api.storyboard.export({
          projectId,
          format: 'png',
          layout: (target.data.layout as 'list' | 'grid3' | 'grid5') || 'grid3',
          frames: frames.map((f) => ({
            sequence: f.sequence,
            description: f.description,
            imageAssetPath: f.imagePath,
          })),
        }).then(() => window.api.storyboard.openOutputDir())
        return
      }
      if (cmd.id === 'style') {
        showToast('请在右侧生成器面板选择「风格模板」', 'info')
      }
    },
    [selectedNodeIds, startRun],
  )

  const fileDrop = useFileDrop()
  const sidebarDrop = useSidebarNodeDrop()
  const assetDrop = useAssetDrop()
  const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } =
    useContextMenuHandlers(setContextMenu)

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const sourceType = getNodeTypeFromId(nodes, connection.source)
      const targetType = getNodeTypeFromId(nodes, connection.target)
      if (
        !isPortCompatible(
          sourceType,
          connection.sourceHandle,
          targetType,
          connection.targetHandle,
        )
      ) {
        return false
      }
      return isTargetHandleAvailable(
        edges,
        connection.target,
        connection.targetHandle,
      )
    },
    [nodes, edges],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection)
    },
    [onConnect],
  )

  useEffect(() => {
    setZoom(Math.round(reactFlow.getZoom() * 100))
  }, [reactFlow, viewport.zoom])

  const handleMove = useCallback(
    (_event: unknown, vp: { zoom: number }) => {
      setZoom(Math.round(vp.zoom * 100))
    },
    [],
  )

  const handleMoveEnd = useCallback(() => {
    setViewport(reactFlow.getViewport())
  }, [reactFlow, setViewport])

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      setNodePicker({ x: event.clientX, y: event.clientY })
    },
    [],
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      fileDrop.onDragOver(e)
      sidebarDrop.onDragOver(e)
      assetDrop.onDragOver(e)
    },
    [fileDrop, sidebarDrop, assetDrop],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('application/localcanvas-node')) {
        sidebarDrop.onDrop(e)
      } else if (e.dataTransfer.types.includes('application/localcanvas')) {
        assetDrop.onDrop(e)
      } else {
        fileDrop.onDrop(e)
      }
    },
    [fileDrop, sidebarDrop, assetDrop],
  )

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
      animated: true,
      interactionWidth: 24,
      deletable: true,
      selectable: true,
    }),
    [],
  )

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const store = useCanvasStore.getState()
      store.setEdges(store.edges.map((e) => ({ ...e, selected: e.id === edge.id })))
      store.setNodes(store.nodes.map((n) => ({ ...n, selected: false })))
      store.setSelectedNodes([])
    },
    [],
  )

  return (
    <div ref={canvasRef} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onlyRenderVisibleElements
        nodeExtent={[
          [-5000, -5000],
          [5000, 5000],
        ]}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView={nodes.length > 0 && viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1}
        minZoom={CANVAS_MIN_ZOOM}
        maxZoom={CANVAS_MAX_ZOOM}
        selectionOnDrag
        panOnDrag={[1]}
        panOnScroll={false}
        zoomOnScroll={!middleMouseDown}
        deleteKeyCode={['Delete', 'Backspace']}
        onEdgeClick={handleEdgeClick}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={() => setContextMenu(null)}
        onPaneDoubleClick={handlePaneDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        colorMode="dark"
        className="bg-bg-primary"
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
        <Controls className="controls-dark" position="bottom-left" />
        <MiniMap
          pannable
          zoomable={false}
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              text: '#8b5cf6',
              image: '#06b6d4',
              video: '#f43f5e',
              audio: '#22c55e',
              script: '#f59e0b',
              compose: '#6366f1',
              storyboard: '#a855f7',
            }
            return colors[node.type || 'text'] || '#6366f1'
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="minimap-dark minimap-pannable"
          position="bottom-right"
        />
        <Panel position="bottom-left" className="canvas-zoom-panel">
          <span className="canvas-zoom-label">{zoom}%</span>
        </Panel>
      </ReactFlow>

      <CanvasToolbar />
      <GeneratorPanel />
      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRunGroup={(ids) => void startRun(ids)}
      />
      <SlashCommandPalette
        open={slashOpen}
        query={slashQuery}
        position={slashPos}
        onSelect={handleSlashSelect}
        onClose={() => setSlashOpen(false)}
      />
      <DagRunPanel runState={runState} onClose={dismiss} />

      {nodePicker && (
        <NodePicker
          x={nodePicker.x}
          y={nodePicker.y}
          onClose={() => setNodePicker(null)}
          onSelect={(type) => {
            const position = reactFlow.screenToFlowPosition({
              x: nodePicker.x,
              y: nodePicker.y,
            })
            addNode({
              id: generateNodeId(type),
              type,
              position,
              data: {},
              selected: true,
            })
            setNodePicker(null)
          }}
        />
      )}
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
