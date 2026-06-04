import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import { ContextMenu, NodePicker, useContextMenuHandlers, type ContextMenuState } from './ContextMenu'
import { CanvasToolbar } from './CanvasToolbar'
import { GeneratorPanel } from '../panels/GeneratorPanel'
import { TimelinePanel } from '../panels/TimelinePanel'
import { isPortCompatible, getNodeTypeFromId, isTargetHandleAvailable } from '../../utils/portCompat'
import { useDataFlow } from '../../hooks/useDataFlow'
import { useFileDrop, useSidebarNodeDrop, useAssetDrop, useKeyboardShortcuts } from '../../hooks/useKeyboard'
import { useAutoSave, useManualSave } from '../../hooks/useAutoSave'
import { generateNodeId } from '../../utils/id'
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from '../../utils/constants'

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
  compose: ComposeNode,
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
  const middleMouseDownRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement>(null)

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

  const handleMoveEnd = useCallback(() => {
    const z = reactFlow.getZoom()
    setZoom(Math.round(z * 100))
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
        <Controls className="controls-dark" />
        <MiniMap
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              text: '#8b5cf6',
              image: '#06b6d4',
              video: '#f43f5e',
              audio: '#22c55e',
              script: '#f59e0b',
              compose: '#6366f1',
            }
            return colors[node.type || 'text'] || '#6366f1'
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="minimap-dark"
        />
      </ReactFlow>

      <div className="absolute bottom-4 left-4 bg-bg-secondary/80 px-2 py-1 rounded text-xs text-text-muted z-10">
        {zoom}%
      </div>

      <CanvasToolbar />
      <TimelinePanel />
      <GeneratorPanel />
      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />

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
