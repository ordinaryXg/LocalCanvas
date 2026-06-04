import { useCallback, useMemo, useState } from 'react'
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
import { ContextMenu, NodePicker, useContextMenuHandlers, type ContextMenuState } from './ContextMenu'
import { CanvasToolbar } from './CanvasToolbar'
import { isPortCompatible, getNodeTypeFromId } from '../../utils/portCompat'
import { useDataFlow } from '../../hooks/useDataFlow'
import { useFileDrop, useSidebarNodeDrop, useKeyboardShortcuts } from '../../hooks/useKeyboard'
import { useAutoSave, useManualSave } from '../../hooks/useAutoSave'
import { generateNodeId } from '../../utils/id'
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from '../../utils/constants'

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
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

  const saveProject = useManualSave()
  useAutoSave()
  useDataFlow()
  useKeyboardShortcuts(saveProject)

  const fileDrop = useFileDrop()
  const sidebarDrop = useSidebarNodeDrop()
  const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } =
    useContextMenuHandlers(setContextMenu)

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const sourceType = getNodeTypeFromId(nodes, connection.source)
      const targetType = getNodeTypeFromId(nodes, connection.target)
      return isPortCompatible(
        sourceType,
        connection.sourceHandle,
        targetType,
        connection.targetHandle,
      )
    },
    [nodes],
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
    },
    [fileDrop, sidebarDrop],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('application/localcanvas-node')) {
        sidebarDrop.onDrop(e)
      } else {
        fileDrop.onDrop(e)
      }
    },
    [fileDrop, sidebarDrop],
  )

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
      animated: true,
    }),
    [],
  )

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView
        minZoom={CANVAS_MIN_ZOOM}
        maxZoom={CANVAS_MAX_ZOOM}
        selectionOnDrag
        panOnDrag={[1]}
        panOnScroll={false}
        zoomOnScroll
        deleteKeyCode={['Delete', 'Backspace']}
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
            })
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
