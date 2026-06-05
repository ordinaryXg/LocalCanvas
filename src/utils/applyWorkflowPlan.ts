import type { Node, Edge } from '@xyflow/react'
import type { WorkflowPlan } from '../types/agent'
import { createCanvasEdge } from './canvasEdge'
import { generateNodeId } from './id'

const COL_WIDTH = 380
const ROW_HEIGHT = 220

export function applyWorkflowPlan(
  plan: WorkflowPlan,
  offset = { x: 120, y: 120 },
): { nodes: Node[]; edges: Edge[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()

  for (const n of plan.nodes) {
    idMap.set(n.tempId, generateNodeId(n.type))
  }

  const nodes: Node[] = plan.nodes.map((n, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const position = n.position ?? {
      x: offset.x + col * COL_WIDTH,
      y: offset.y + row * ROW_HEIGHT,
    }

    return {
      id: idMap.get(n.tempId)!,
      type: n.type,
      position,
      data: {
        ...n.data,
        ...(n.label ? { label: n.label } : {}),
        ...(typeof n.data.modelId === 'string' && n.data.modelId
          ? { modelId: n.data.modelId }
          : n.modelHint
            ? { modelId: n.modelHint }
            : {}),
      },
    }
  })

  const edges: Edge[] = plan.edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) =>
      createCanvasEdge({
        id: generateNodeId('edge'),
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }),
    )

  return { nodes, edges, idMap }
}
