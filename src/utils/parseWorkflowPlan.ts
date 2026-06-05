import type { WorkflowPlan } from '../types/agent'

export class WorkflowPlanParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowPlanParseError'
  }
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

const VALID_TYPES = new Set(['text', 'image', 'video', 'audio', 'script', 'compose', 'storyboard'])

export function parseWorkflowPlan(raw: string, intent = ''): WorkflowPlan {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonBlock(raw))
  } catch {
    throw new WorkflowPlanParseError('无法解析 Agent 返回的 JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new WorkflowPlanParseError('计划格式无效')
  }

  const obj = parsed as Record<string, unknown>
  const nodes = Array.isArray(obj.nodes) ? obj.nodes : []
  const edges = Array.isArray(obj.edges) ? obj.edges : []

  const plannedNodes = nodes.map((n, i) => {
    const node = n as Record<string, unknown>
    const type = String(node.type ?? 'text')
    if (!VALID_TYPES.has(type)) {
      throw new WorkflowPlanParseError(`未知节点类型: ${type}`)
    }
    return {
      tempId: String(node.tempId ?? `node-${i + 1}`),
      type: type as WorkflowPlan['nodes'][0]['type'],
      label: node.label ? String(node.label) : undefined,
      data: (node.data as Record<string, unknown>) ?? {},
      modelHint: node.modelHint ? String(node.modelHint) : undefined,
      position: node.position as { x: number; y: number } | undefined,
    }
  })

  const plannedEdges = edges.map((e, i) => {
    const edge = e as Record<string, unknown>
    return {
      source: String(edge.source ?? ''),
      sourceHandle: String(edge.sourceHandle ?? 'prompt'),
      target: String(edge.target ?? ''),
      targetHandle: String(edge.targetHandle ?? 'prompt'),
    }
  })

  if (plannedNodes.length === 0) {
    throw new WorkflowPlanParseError('计划至少需要一个节点')
  }

  return {
    version: 1,
    intent: String(obj.intent ?? intent),
    summary: String(obj.summary ?? '工作流计划'),
    nodes: plannedNodes,
    edges: plannedEdges,
    executionMode: obj.executionMode === 'manual' ? 'manual' : 'auto',
    estimatedSteps: Number(obj.estimatedSteps ?? plannedNodes.length),
    skillId: obj.skillId ? String(obj.skillId) : undefined,
  }
}
