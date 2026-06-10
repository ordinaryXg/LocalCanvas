import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  ConnectionLineType,
  type Connection,
  BackgroundVariant,
  type Node,
  type Edge,
  type IsValidConnection,
  type FinalConnectionState,
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
import { ContextMenu, NodePicker, useContextMenuHandlers, type ContextMenuState } from './ContextMenu'
import { CanvasToolbar } from './CanvasToolbar'
import { GeneratorDrawer } from '../shell/GeneratorDrawer'
import { getNodeTypeFromId } from '../../utils/portCompat'
import { describeConnectionReject } from '../../utils/connectionFeedback'
import {
  isUnifiedInboundUnresolved,
  normalizeInboundConnection,
} from '../../capabilities/canvas-inbound-connection'
import { useDataFlow } from '../../hooks/useDataFlow'
import { useFileDrop, useSidebarNodeDrop, useAssetDrop, useKeyboardShortcuts, useSpacePan } from '../../hooks/useKeyboard'
import { useAutoSave, useManualSave } from '../../hooks/useAutoSave'
import { generateNodeId } from '../../utils/id'
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from '../../utils/constants'
import { CANVAS_EDGE_STYLE, CANVAS_EDGE_TYPE } from '../../utils/canvasEdge'
import { CanvasControls } from './CanvasControls'
import { useDagRun } from '../../hooks/useDagRun'
import { useCanvasSlash } from '../../hooks/useCanvasSlash'
import { useCanvasProjectBootstrap } from '../../hooks/useCanvasProjectBootstrap'
import { DagRunPanel } from '../panels/DagRunPanel'
import { SlashCommandPalette } from './SlashCommandPalette'
import { useCanvasStore as getCanvasStore } from '../../stores/canvasStore'
import { showToast } from '../../utils/ErrorHandler'
import { fitViewAndSyncViewport } from '../../utils/canvasViewport'
import { minimapNodeColor } from '../../utils/canvasMinimap'

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
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const viewport = useCanvasStore((s) => s.viewport)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const addNode = useCanvasStore((s) => s.addNode)
  const setViewport = useCanvasStore((s) => s.setViewport)
  const layoutNodes = useCanvasStore((s) => s.layoutNodes)
  const loadProject = useCanvasStore((s) => s.loadProject)

  const reactFlow = useReactFlow()
  const [zoom, setZoom] = useState(100)
  const [isInteractive, setIsInteractive] = useState(true)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodePicker, setNodePicker] = useState<{ x: number; y: number } | null>(null)
  const [middleMouseDown, setMiddleMouseDown] = useState(false)
  const middleMouseDownRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const focusNodeRequestId = useCanvasStore((s) => s.focusNodeRequestId)
  const clearFocusNodeRequest = useCanvasStore((s) => s.clearFocusNodeRequest)
  const { runState, startRun, skipNode, retryNode, continueRun, dismiss } = useDagRun()
  const { slashOpen, slashQuery, slashPos, setSlashOpen, handleSlashSelect } = useCanvasSlash(
    selectedNodeIds,
    startRun,
  )

  useCanvasProjectBootstrap({
    nodes,
    viewport,
    reactFlow,
    canvasRef,
    setViewport,
    loadProject,
    focusNodeRequestId,
    clearFocusNodeRequest,
  })

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
  const spacePanHeld = useSpacePan({ disabled: slashOpen })

  const fileDrop = useFileDrop()
  const sidebarDrop = useSidebarNodeDrop()
  const assetDrop = useAssetDrop()
  const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } =
    useContextMenuHandlers(setContextMenu)

  const isValidConnection: IsValidConnection = useCallback(
    (connection) =>
      describeConnectionReject(connection as Connection, nodes, edges) === null,
    [nodes, edges],
  )

  const handleConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid !== false || !state.fromNode || !state.toNode) return
      const connection: Connection = {
        source: state.fromNode.id,
        target: state.toNode.id,
        sourceHandle: state.fromHandle?.id ?? null,
        targetHandle: state.toHandle?.id ?? null,
      }
      const reason = describeConnectionReject(connection, nodes, edges)
      if (reason) showToast(reason, 'warning')
    },
    [nodes, edges],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const sourceType = getNodeTypeFromId(nodes, connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      const targetType = targetNode?.type ?? getNodeTypeFromId(nodes, connection.target)
      const normalized = normalizeInboundConnection(
        connection,
        sourceType,
        targetType,
        targetNode?.data?.modelId as string | undefined,
        edges,
      )
      if (isUnifiedInboundUnresolved(targetType, connection.targetHandle, normalized.targetHandle)) {
        return
      }
      onConnect(normalized)
    },
    [edges, nodes, onConnect],
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

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return
      if (!target.closest('.react-flow__pane')) return
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
      type: CANVAS_EDGE_TYPE,
      style: CANVAS_EDGE_STYLE,
      animated: true,
      interactionWidth: 24,
      deletable: true,
      selectable: true,
    }),
    [],
  )

  const handleAutoLayout = useCallback(() => {
    const applied = layoutNodes()
    if (!applied) {
      showToast('没有可排版的顶层节点', 'info')
      return
    }
    void fitViewAndSyncViewport(reactFlow, setViewport, { padding: 0.2, duration: 320 })
    showToast('已自动排版', 'info')
  }, [layoutNodes, reactFlow, setViewport])

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const store = useCanvasStore.getState()
      store.setEdges(store.edges.map((e) => ({ ...e, selected: e.id === edge.id })))
      store.setNodes(store.nodes.map((n) => ({ ...n, selected: false })))
      store.setSelectedNodes([])
    },
    [],
  )

  const canvasEditable = isInteractive && !spacePanHeld

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full relative overflow-hidden${spacePanHeld ? ' canvas-space-pan' : ''}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        viewport={viewport}
        onViewportChange={setViewport}
        minZoom={CANVAS_MIN_ZOOM}
        maxZoom={CANVAS_MAX_ZOOM}
        nodesDraggable={canvasEditable}
        nodesConnectable={canvasEditable}
        elementsSelectable={canvasEditable}
        edgesReconnectable={canvasEditable}
        selectionOnDrag={canvasEditable}
        panOnDrag={spacePanHeld ? [0, 1] : isInteractive ? [1] : false}
        panOnScroll={false}
        zoomOnScroll={isInteractive && !middleMouseDown && !spacePanHeld}
        zoomOnDoubleClick={false}
        connectionLineType={ConnectionLineType.Bezier}
        deleteKeyCode={['Delete', 'Backspace']}
        onEdgeClick={handleEdgeClick}
        onMove={handleMove}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={() => setContextMenu(null)}
        onDoubleClick={handlePaneDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        colorMode="dark"
        className="bg-bg-primary"
        defaultEdgeOptions={defaultEdgeOptions}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--token-border)" />
        <CanvasControls
          isInteractive={isInteractive}
          onInteractiveChange={setIsInteractive}
          onAutoLayout={handleAutoLayout}
        />
        <MiniMap
          pannable
          zoomable={false}
          nodeColor={(node) => minimapNodeColor(node.type)}
          maskColor="rgba(0,0,0,0.7)"
          className="minimap-dark minimap-pannable"
          position="bottom-right"
        />
        <Panel position="bottom-left" className="canvas-zoom-panel">
          <span className="canvas-zoom-label">{zoom}%</span>
        </Panel>
      </ReactFlow>

      <CanvasToolbar />
      <GeneratorDrawer containerRef={canvasRef} />
      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRunGroup={(ids) => void startRun(ids)}
        onRunUntil={(ids, untilId) => void startRun(ids, { untilNodeId: untilId })}
      />
      <SlashCommandPalette
        open={slashOpen}
        query={slashQuery}
        position={slashPos}
        onSelect={handleSlashSelect}
        onClose={() => setSlashOpen(false)}
      />
      <DagRunPanel
        runState={runState}
        onClose={dismiss}
        onRetry={retryNode}
        onSkip={skipNode}
        onContinue={continueRun}
      />

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
