import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  type Viewport,
} from '@xyflow/react'
import { pushHistory, clearHistory } from './historyStore'
import { useProjectStore } from './projectStore'
import { generateNodeId } from '../utils/id'

import type { DataFlowPatch } from '../utils/dataFlow'
import { computeCanvasLayout } from '../utils/canvasLayout'
import { connectionToEdgeParams, normalizeCanvasEdges } from '../utils/canvasEdge'
import { evaluateEdgeCompat } from '../capabilities/edge-compat'
import type { ModelKind } from '../types/capability'
import { migrateImageOutputEdges, getNodeTypeFromId } from '../utils/portCompat'
import { refreshEdgeCompatStyles } from '../capabilities/refresh-edge-compat'
import { normalizeTextNodeData } from '../utils/textNodeOutput'
import { withDefaultNodeTitle } from '../utils/nodeNaming'

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  selectedNodeIds: string[]
  /** 非空时 Canvas 会将视口移至该节点 */
  focusNodeRequestId: string | null

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  addConnection: (connection: Connection) => void
  duplicateNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  applyDataFlowPatches: (patches: DataFlowPatch[]) => void
  updateNodeSize: (nodeId: string, width: number, height: number) => void
  removeNodes: (ids: string[]) => void
  removeEdge: (edgeId: string) => void
  removeEdges: (edgeIds: string[]) => void
  groupNodes: (ids: string[]) => void
  setSelectedNodes: (ids: string[]) => void
  selectAndFocusNode: (nodeId: string) => void
  clearFocusNodeRequest: () => void
  setViewport: (viewport: Viewport, options?: { silent?: boolean }) => void
  loadProject: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void
  restoreSnapshot: (nodes: Node[], edges: Edge[]) => void
  layoutNodes: () => boolean
  markDirty: () => void
}

function snapshot(state: CanvasState): { nodes: Node[]; edges: Edge[] } {
  return { nodes: state.nodes, edges: state.edges }
}

function recordHistory(get: () => CanvasState): void {
  pushHistory(snapshot(get()))
  useProjectStore.getState().setDirty(true)
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  focusNodeRequestId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes: NodeChange[]) => {
    const shouldRecord =
      changes.some((c) => c.type === 'remove') ||
      changes.some((c) => c.type === 'add') ||
      changes.some((c) => c.type === 'position' && c.dragging === false) ||
      changes.some((c) => c.type === 'dimensions' && c.resizing === false)

    if (shouldRecord) recordHistory(get)

    const nextNodes = applyNodeChanges(changes, get().nodes)
    const selected = nextNodes.filter((n) => n.selected).map((n) => n.id)
    set({ nodes: nextNodes, selectedNodeIds: selected })
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const shouldRecord =
      changes.some((c) => c.type === 'remove') || changes.some((c) => c.type === 'add')
    if (shouldRecord) recordHistory(get)
    set({ edges: applyEdgeChanges(changes, get().edges) })
    if (changes.some((c) => c.type === 'remove')) {
      useProjectStore.getState().setDirty(true)
    }
  },

  onConnect: (connection: Connection) => {
    recordHistory(get)
    const nodes = get().nodes
    const edges = get().edges
    const sourceType = getNodeTypeFromId(nodes, connection.source)
    const targetNode = nodes.find((n) => n.id === connection.target)
    const targetType = targetNode?.type
    const targetKind: ModelKind =
      targetType === 'image'
        ? 'image'
        : targetType === 'video'
          ? 'video'
          : 'llm'
    const compatResult = evaluateEdgeCompat({
      sourceType,
      sourceHandle: connection.sourceHandle,
      targetType,
      targetHandle: connection.targetHandle,
      targetModelId: targetNode?.data?.modelId as string | undefined,
      targetKind,
      edges,
      targetNodeId: connection.target,
    })
    const compat =
      compatResult.status === 'reject'
        ? { status: 'solid' as const }
        : { status: compatResult.status, reason: compatResult.reason }
    set({
      edges: addEdge(connectionToEdgeParams(connection, compat), edges),
    })
  },

  addNode: (node) => {
    recordHistory(get)
    let nodes = get().nodes
    if (node.selected) {
      nodes = nodes.map((n) => ({ ...n, selected: false }))
    }
    const data = withDefaultNodeTitle(
      node.type,
      nodes,
      (node.data ?? {}) as Record<string, unknown>,
    )
    nodes = [...nodes, { ...node, data }]
    set({
      nodes,
      selectedNodeIds: node.selected ? [node.id] : nodes.filter((n) => n.selected).map((n) => n.id),
    })
  },

  addConnection: (connection) => {
    recordHistory(get)
    set({
      edges: addEdge(connectionToEdgeParams(connection), get().edges),
    })
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node) return
    recordHistory(get)
    const copy: Node = {
      ...node,
      id: generateNodeId(node.type ?? 'node'),
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
      data: withDefaultNodeTitle(node.type, get().nodes, {
        ...(node.data as Record<string, unknown>),
      }),
    }
    set({ nodes: [...get().nodes, copy] })
  },

  updateNodeData: (nodeId, data) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node) return

    const hasChange = Object.entries(data).some(
      ([key, value]) => node.data[key] !== value,
    )
    if (!hasChange) return

    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
    )
    const shouldRefreshEdges =
      'modelId' in data && node.type !== undefined && ['image', 'video', 'text'].includes(node.type)
    set({
      nodes: nextNodes,
      ...(shouldRefreshEdges
        ? { edges: refreshEdgeCompatStyles(nextNodes, get().edges) }
        : {}),
    })
    useProjectStore.getState().setDirty(true)
  },

  applyDataFlowPatches: (patches) => {
    if (patches.length === 0) return

    const nodes = get().nodes
    let changed = false
    const nextNodes = nodes.map((node) => {
      const patch = patches.find((p) => p.nodeId === node.id)
      if (!patch) return node

      const hasChange = Object.entries(patch.data).some(
        ([key, value]) => node.data[key] !== value,
      )
      if (!hasChange) return node

      changed = true
      const nextData = { ...node.data, ...patch.data }
      for (const [key, value] of Object.entries(patch.data)) {
        if (value === undefined) delete nextData[key]
      }
      return { ...node, data: nextData }
    })

    if (!changed) return
    set({ nodes: nextNodes })
    useProjectStore.getState().setDirty(true)
  },

  updateNodeSize: (nodeId, width, height) => {
    const roundedW = Math.round(width)
    const roundedH = Math.round(height)
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node || node.width === roundedW && node.height === roundedH) return

    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, width: roundedW, height: roundedH } : n,
      ),
    })
    useProjectStore.getState().setDirty(true)
  },

  removeNodes: (ids) => {
    recordHistory(get)
    set({
      nodes: get().nodes.filter((n) => !ids.includes(n.id)),
      edges: get().edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)),
    })
  },

  removeEdge: (edgeId) => {
    recordHistory(get)
    set({ edges: get().edges.filter((e) => e.id !== edgeId) })
    useProjectStore.getState().setDirty(true)
  },

  removeEdges: (edgeIds) => {
    if (edgeIds.length === 0) return
    recordHistory(get)
    const drop = new Set(edgeIds)
    set({ edges: get().edges.filter((e) => !drop.has(e.id)) })
    useProjectStore.getState().setDirty(true)
  },

  groupNodes: (ids) => {
    const childNodes = get().nodes.filter((n) => ids.includes(n.id) && n.type !== 'group')
    if (childNodes.length < 2) return

    recordHistory(get)

    const minX = Math.min(...childNodes.map((n) => n.position.x))
    const minY = Math.min(...childNodes.map((n) => n.position.y))
    const maxX = Math.max(...childNodes.map((n) => n.position.x + (n.measured?.width ?? 200)))
    const maxY = Math.max(...childNodes.map((n) => n.position.y + (n.measured?.height ?? 120)))

    const groupNode: Node = {
      id: generateNodeId('group'),
      type: 'group',
      position: { x: minX - 20, y: minY - 40 },
      style: {
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        border: '1px dashed var(--token-accent, #6366f1)',
        borderRadius: 8,
        width: maxX - minX + 60,
        height: maxY - minY + 80,
      },
      data: { label: 'Group' },
    }

    const updatedNodes = get().nodes.map((n) => {
      if (!ids.includes(n.id)) return n
      return {
        ...n,
        parentId: groupNode.id,
        extent: 'parent' as const,
        position: {
          x: n.position.x - groupNode.position.x,
          y: n.position.y - groupNode.position.y,
        },
      }
    })

    set({ nodes: [...updatedNodes, groupNode] })
  },

  setSelectedNodes: (ids) => {
    const idSet = new Set(ids)
    set({
      selectedNodeIds: ids,
      nodes: get().nodes.map((n) => ({ ...n, selected: idSet.has(n.id) })),
      edges: get().edges.map((e) => ({ ...e, selected: false })),
    })
  },

  selectAndFocusNode: (nodeId) => {
    if (!get().nodes.some((n) => n.id === nodeId)) return
    set({
      selectedNodeIds: [nodeId],
      focusNodeRequestId: nodeId,
      nodes: get().nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
      edges: get().edges.map((e) => ({ ...e, selected: false })),
    })
  },

  clearFocusNodeRequest: () => set({ focusNodeRequestId: null }),

  setViewport: (viewport, options) => {
    set({ viewport })
    if (!options?.silent) {
      useProjectStore.getState().setDirty(true)
    }
  },

  loadProject: (nodes, edges, viewport) => {
    clearHistory()
    const normalizedNodes = nodes.map((node) => {
      if (node.type !== 'text') return node
      return {
        ...node,
        data: normalizeTextNodeData((node.data ?? {}) as Record<string, unknown>),
      }
    })
    const migratedEdges = refreshEdgeCompatStyles(
      normalizedNodes,
      normalizeCanvasEdges(migrateImageOutputEdges(normalizedNodes, edges)),
    )
    set({
      nodes: normalizedNodes,
      edges: migratedEdges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
      focusNodeRequestId: null,
    })
    useProjectStore.getState().setDirty(false)
  },

  restoreSnapshot: (nodes, edges) => {
    set({ nodes, edges: normalizeCanvasEdges(edges) })
    useProjectStore.getState().setDirty(true)
  },

  layoutNodes: () => {
    const { nodes, edges } = get()
    const positions = computeCanvasLayout(nodes, edges)
    if (positions.size === 0) return false

    recordHistory(get)
    set({
      nodes: nodes.map((node) => {
        const next = positions.get(node.id)
        if (!next) return node
        return { ...node, position: next }
      }),
    })
    return true
  },

  markDirty: () => useProjectStore.getState().setDirty(true),
}))
