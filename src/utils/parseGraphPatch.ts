import type { GraphPatch, PlannedEdge, PlannedNode } from '../types/agent'

export class GraphPatchParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphPatchParseError'
  }
}

const VALID_TYPES = new Set(['text', 'image', 'video', 'audio', 'script', 'compose', 'storyboard'])

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

function parsePlannedNode(n: unknown, index: number): PlannedNode {
  const node = n as Record<string, unknown>
  const type = String(node.type ?? 'text')
  if (!VALID_TYPES.has(type)) {
    throw new GraphPatchParseError(`未知节点类型: ${type}`)
  }
  return {
    tempId: String(node.tempId ?? `new-${index + 1}`),
    type: type as PlannedNode['type'],
    label: node.label ? String(node.label) : undefined,
    data: (node.data as Record<string, unknown>) ?? {},
    modelHint: node.modelHint ? String(node.modelHint) : undefined,
    position: node.position as { x: number; y: number } | undefined,
  }
}

function parsePlannedEdge(e: unknown): PlannedEdge {
  const edge = e as Record<string, unknown>
  return {
    source: String(edge.source ?? ''),
    sourceHandle: String(edge.sourceHandle ?? 'prompt'),
    target: String(edge.target ?? ''),
    targetHandle: String(edge.targetHandle ?? 'prompt'),
  }
}

export function parseGraphPatch(raw: string, intent = '', anchorNodeIds: string[] = []): GraphPatch {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonBlock(raw))
  } catch {
    throw new GraphPatchParseError('无法解析 GraphPatch JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new GraphPatchParseError('补丁格式无效')
  }

  const obj = parsed as Record<string, unknown>
  const anchors = Array.isArray(obj.anchorNodeIds)
    ? (obj.anchorNodeIds as unknown[]).map(String)
    : anchorNodeIds

  const addNodes = Array.isArray(obj.addNodes)
    ? obj.addNodes.map((n, i) => parsePlannedNode(n, i))
    : undefined
  const addEdges = Array.isArray(obj.addEdges)
    ? obj.addEdges.map(parsePlannedEdge)
    : undefined

  const executionMode = obj.executionMode
  const parsedExecution =
    executionMode === 'auto' || executionMode === 'checkpoint' || executionMode === 'none'
      ? executionMode
      : 'none'

  return {
    version: 1,
    intent: String(obj.intent ?? intent),
    summary: String(obj.summary ?? '图补丁'),
    anchorNodeIds: anchors,
    addNodes,
    addEdges,
    removeNodeIds: Array.isArray(obj.removeNodeIds)
      ? (obj.removeNodeIds as unknown[]).map(String)
      : undefined,
    removeEdgeIds: Array.isArray(obj.removeEdgeIds)
      ? (obj.removeEdgeIds as unknown[]).map(String)
      : undefined,
    updateNodes: Array.isArray(obj.updateNodes)
      ? (obj.updateNodes as unknown[]).map((u) => {
          const row = u as Record<string, unknown>
          return {
            nodeId: String(row.nodeId ?? row.tempId ?? ''),
            data: (row.data as Record<string, unknown>) ?? {},
          }
        })
      : undefined,
    executionMode: parsedExecution,
  }
}

export function isValidGraphPatch(patch: unknown): patch is GraphPatch {
  if (!patch || typeof patch !== 'object') return false
  const candidate = patch as GraphPatch
  return Array.isArray(candidate.anchorNodeIds)
}
