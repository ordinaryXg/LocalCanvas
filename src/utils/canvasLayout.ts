import type { Node, Edge } from '@xyflow/react'

const HORIZONTAL_GAP = 140
const VERTICAL_GAP = 56
const COMPONENT_GAP = 200
const LAYOUT_PADDING = 80

const DEFAULT_NODE_SIZE: Record<string, { width: number; height: number }> = {
  text: { width: 280, height: 160 },
  image: { width: 240, height: 280 },
  video: { width: 280, height: 360 },
  audio: { width: 220, height: 120 },
  script: { width: 300, height: 200 },
  compose: { width: 280, height: 200 },
  storyboard: { width: 400, height: 300 },
  group: { width: 400, height: 300 },
}

function nodeSize(node: Node): { width: number; height: number } {
  const fallback = DEFAULT_NODE_SIZE[node.type ?? 'text'] ?? { width: 240, height: 180 }
  return {
    width: Math.max(fallback.width, node.width ?? fallback.width),
    height: Math.max(fallback.height, node.height ?? fallback.height),
  }
}

function findConnectedComponents(nodeIds: string[], edges: Edge[]): string[][] {
  const adj = new Map<string, Set<string>>()
  for (const id of nodeIds) adj.set(id, new Set())
  for (const edge of edges) {
    if (!adj.has(edge.source) || !adj.has(edge.target)) continue
    adj.get(edge.source)!.add(edge.target)
    adj.get(edge.target)!.add(edge.source)
  }

  const visited = new Set<string>()
  const components: string[][] = []

  for (const id of nodeIds) {
    if (visited.has(id)) continue
    const stack = [id]
    const component: string[] = []
    visited.add(id)
    while (stack.length > 0) {
      const current = stack.pop()!
      component.push(current)
      for (const next of adj.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next)
          stack.push(next)
        }
      }
    }
    components.push(component)
  }

  return components
}

function assignLayers(nodeIds: string[], edges: Edge[]): Map<string, number> {
  const layers = new Map<string, number>()
  for (const id of nodeIds) layers.set(id, 0)

  for (let pass = 0; pass < nodeIds.length; pass++) {
    for (const edge of edges) {
      if (!layers.has(edge.source) || !layers.has(edge.target)) continue
      const next = (layers.get(edge.source) ?? 0) + 1
      if (next > (layers.get(edge.target) ?? 0)) {
        layers.set(edge.target, next)
      }
    }
  }

  return layers
}

function layoutComponent(
  nodeIds: string[],
  edges: Edge[],
  nodesById: Map<string, Node>,
  offsetX: number,
): { positions: Map<string, { x: number; y: number }>; width: number } {
  const layers = assignLayers(nodeIds, edges)
  const layerBuckets = new Map<number, string[]>()

  for (const id of nodeIds) {
    const layer = layers.get(id) ?? 0
    const bucket = layerBuckets.get(layer) ?? []
    bucket.push(id)
    layerBuckets.set(layer, bucket)
  }

  const sortedLayers = [...layerBuckets.keys()].sort((a, b) => a - b)
  const layerX = new Map<number, number>()
  let cursorX = offsetX
  let maxRight = offsetX

  for (const layer of sortedLayers) {
    layerX.set(layer, cursorX)
    const ids = layerBuckets.get(layer) ?? []
    const maxWidth = Math.max(...ids.map((id) => nodeSize(nodesById.get(id)!).width), 0)
    cursorX += maxWidth + HORIZONTAL_GAP
    maxRight = Math.max(maxRight, cursorX - HORIZONTAL_GAP)
  }

  const positions = new Map<string, { x: number; y: number }>()

  for (const layer of sortedLayers) {
    const ids = (layerBuckets.get(layer) ?? []).slice().sort((a, b) => {
      const ay = nodesById.get(a)?.position.y ?? 0
      const by = nodesById.get(b)?.position.y ?? 0
      if (ay !== by) return ay - by
      const ax = nodesById.get(a)?.position.x ?? 0
      const bx = nodesById.get(b)?.position.x ?? 0
      return ax - bx
    })

    let y = 0
    for (const id of ids) {
      const { height } = nodeSize(nodesById.get(id)!)
      positions.set(id, {
        x: (layerX.get(layer) ?? offsetX) + LAYOUT_PADDING,
        y: y + LAYOUT_PADDING,
      })
      y += height + VERTICAL_GAP
    }
  }

  return { positions, width: maxRight - offsetX }
}

/**
 * 按 DAG 分层（左→右）重新排布顶层节点，使工作流更整洁。
 * 组内子节点保持相对位置不变。
 */
export function computeCanvasLayout(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const layoutable = nodes.filter((n) => !n.parentId)
  if (layoutable.length === 0) return new Map()

  const layoutableIds = layoutable.map((n) => n.id)
  const layoutableSet = new Set(layoutableIds)
  const relevantEdges = edges.filter(
    (e) => layoutableSet.has(e.source) && layoutableSet.has(e.target),
  )
  const nodesById = new Map(layoutable.map((n) => [n.id, n]))

  const components = findConnectedComponents(layoutableIds, relevantEdges)
  const result = new Map<string, { x: number; y: number }>()
  let offsetX = 0

  for (const component of components) {
    const { positions, width } = layoutComponent(component, relevantEdges, nodesById, offsetX)
    for (const [id, pos] of positions) result.set(id, pos)
    offsetX += width + COMPONENT_GAP
  }

  return result
}
