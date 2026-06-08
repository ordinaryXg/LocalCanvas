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
import { ComposeEditor } from '../compose/ComposeEditor'
import { isEditorShell } from '../../constants/editorFeatures'
import { useComposeEditorStore } from '../../stores/composeEditorStore'
import { isPortCompatible, getNodeTypeFromId, isTargetHandleAvailable } from '../../utils/portCompat'
import { evaluateEdgeCompat } from '../../capabilities/edge-compat'
import type { ModelKind } from '../../types/capability'
import { useDataFlow } from '../../hooks/useDataFlow'
import { useFileDrop, useSidebarNodeDrop, useAssetDrop, useKeyboardShortcuts, useSpacePan } from '../../hooks/useKeyboard'
import { useAutoSave, useManualSave } from '../../hooks/useAutoSave'
import { generateNodeId } from '../../utils/id'
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from '../../utils/constants'
import { CANVAS_EDGE_STYLE, CANVAS_EDGE_TYPE } from '../../utils/canvasEdge'
import { CanvasControls } from './CanvasControls'
import { useDagRun } from '../../hooks/useDagRun'
import { DagRunPanel } from '../panels/DagRunPanel'
import { SlashCommandPalette } from './SlashCommandPalette'
import { useCanvasStore as getCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { showToast } from '../../utils/ErrorHandler'
import { fitViewAndSyncViewport, focusNodeInView, viewportLikelyShowsNodes } from '../../utils/canvasViewport'
import { hydrateProjectNodes } from '../../utils/assetStorage'
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
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setViewport,
    layoutNodes,
    loadProject,
  } = useCanvasStore()

  const reactFlow = useReactFlow()
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const bootstrappedProjectRef = useRef<string | null>(null)
  const reloadAttemptedRef = useRef<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isInteractive, setIsInteractive] = useState(true)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodePicker, setNodePicker] = useState<{ x: number; y: number } | null>(null)
  const [middleMouseDown, setMiddleMouseDown] = useState(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 })
  const middleMouseDownRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const focusNodeRequestId = useCanvasStore((s) => s.focusNodeRequestId)
  const clearFocusNodeRequest = useCanvasStore((s) => s.clearFocusNodeRequest)
  const composeEditorNodeId = useComposeEditorStore((s) => s.activeNodeId)
  const composeEditorDismissed = useComposeEditorStore((s) => s.dismissed)
  const openComposeEditor = useComposeEditorStore((s) => s.open)
  const clearComposeEditor = useComposeEditorStore((s) => s.clear)
  const { runState, startRun, skipNode, retryNode, dismiss } = useDagRun()

  useEffect(() => {
    if (isEditorShell()) return
    const composeNode = nodes.find(
      (n) => selectedNodeIds.includes(n.id) && n.type === 'compose',
    )
    if (composeNode) {
      openComposeEditor(composeNode.id)
    } else {
      clearComposeEditor()
    }
  }, [selectedNodeIds, nodes, openComposeEditor, clearComposeEditor])

  useEffect(() => {
    if (!focusNodeRequestId) return
    const exists = nodes.some((n) => n.id === focusNodeRequestId)
    if (!exists) {
      clearFocusNodeRequest()
      return
    }
    void focusNodeInView(reactFlow, focusNodeRequestId, setViewport).finally(() => {
      clearFocusNodeRequest()
    })
  }, [focusNodeRequestId, nodes, reactFlow, setViewport, clearFocusNodeRequest])

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
        const store = getCanvasStore.getState()
        const imageOrVideo = store.nodes.find(
          (n) =>
            selectedNodeIds.includes(n.id) &&
            (n.type === 'image' || n.type === 'video'),
        )
        if (!imageOrVideo) {
          showToast('请先选中一个图片或视频节点', 'info')
          return
        }
        if (!selectedNodeIds.includes(imageOrVideo.id)) {
          store.setSelectedNodes([imageOrVideo.id])
        }
        useEditorShellStore.getState().requestFocusStyleChips()
        return
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
      const targetNode = nodes.find((n) => n.id === connection.target)
      const targetType = targetNode?.type ?? getNodeTypeFromId(nodes, connection.target)
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
      const targetKind: ModelKind =
        targetType === 'image' ? 'image' : targetType === 'video' ? 'video' : 'llm'
      const compat = evaluateEdgeCompat({
        sourceType,
        sourceHandle: connection.sourceHandle,
        targetType,
        targetHandle: connection.targetHandle,
        targetModelId: targetNode?.data?.modelId as string | undefined,
        targetKind,
        edges,
        targetNodeId: connection.target,
      })
      if (compat.status === 'reject') return false
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

  useEffect(() => {
    if (!currentProjectId) {
      bootstrappedProjectRef.current = null
      reloadAttemptedRef.current = null
      return
    }

    if (nodes.length === 0) {
      if (reloadAttemptedRef.current === currentProjectId) return
      reloadAttemptedRef.current = currentProjectId
      void (async () => {
        try {
          const data = await window.api.project.load(currentProjectId)
          const rawNodes = data.nodes as Node[]
          if (rawNodes.length === 0) return
          const hydrated = await hydrateProjectNodes(currentProjectId, rawNodes)
          loadProject(hydrated, data.edges as Edge[], data.viewport)
        } catch {
          /* 由 openProject 负责主流程，此处仅兜底 */
        }
      })()
      return
    }

    if (bootstrappedProjectRef.current === currentProjectId) return

    const frame = requestAnimationFrame(() => {
      void (async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const latestNodes = useCanvasStore.getState().nodes
        if (!viewportLikelyShowsNodes(reactFlow, latestNodes, canvasRef.current)) {
          await fitViewAndSyncViewport(reactFlow, setViewport, { duration: 0 })
        } else {
          await reactFlow.setViewport(viewport, { duration: 0 })
        }
        bootstrappedProjectRef.current = currentProjectId
      })()
    })

    return () => cancelAnimationFrame(frame)
  }, [currentProjectId, nodes.length, loadProject, reactFlow, setViewport, viewport])

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
      className={`w-full h-full relative${spacePanHeld ? ' canvas-space-pan' : ''}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
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
        connectionLineType={ConnectionLineType.Bezier}
        deleteKeyCode={['Delete', 'Backspace']}
        onEdgeClick={handleEdgeClick}
        onMove={handleMove}
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
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border)" />
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
      {!isEditorShell() && <GeneratorPanel />}
      {!isEditorShell() && composeEditorNodeId && !composeEditorDismissed && (
        <ComposeEditor nodeId={composeEditorNodeId} />
      )}
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
