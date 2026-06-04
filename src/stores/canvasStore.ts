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

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  selectedNodeIds: string[]

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  duplicateNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  removeNodes: (ids: string[]) => void
  removeEdge: (edgeId: string) => void
  groupNodes: (ids: string[]) => void
  setSelectedNodes: (ids: string[]) => void
  setViewport: (viewport: Viewport) => void
  loadProject: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void
  restoreSnapshot: (nodes: Node[], edges: Edge[]) => void
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

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes: NodeChange[]) => {
    const shouldRecord =
      changes.some((c) => c.type === 'remove') ||
      changes.some((c) => c.type === 'add') ||
      changes.some((c) => c.type === 'position' && c.dragging === false)

    if (shouldRecord) recordHistory(get)

    set({ nodes: applyNodeChanges(changes, get().nodes) })

    const selected = get()
      .nodes.filter((n) => n.selected)
      .map((n) => n.id)
    set({ selectedNodeIds: selected })
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const shouldRecord = changes.some((c) => c.type === 'remove')
    if (shouldRecord) recordHistory(get)
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection: Connection) => {
    recordHistory(get)
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--color-accent, #6366f1)', strokeWidth: 2 },
        },
        get().edges,
      ),
    })
  },

  addNode: (node) => {
    recordHistory(get)
    set({ nodes: [...get().nodes, node] })
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
      data: { ...node.data },
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

    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
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
        border: '1px dashed var(--color-accent, #6366f1)',
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

  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),

  setViewport: (viewport) => {
    set({ viewport })
    useProjectStore.getState().setDirty(true)
  },

  loadProject: (nodes, edges, viewport) => {
    clearHistory()
    set({
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
    })
    useProjectStore.getState().setDirty(false)
  },

  restoreSnapshot: (nodes, edges) => {
    set({ nodes, edges })
    useProjectStore.getState().setDirty(true)
  },

  markDirty: () => useProjectStore.getState().setDirty(true),
}))
