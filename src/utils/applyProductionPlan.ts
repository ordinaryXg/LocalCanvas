import type { Node, Edge } from '@xyflow/react'
import type { ProductionPlan } from '../types/agent'
import { applyWorkflowPlan } from './applyWorkflowPlan'

export interface ApplyProductionPlanResult {
  nodes: Node[]
  edges: Edge[]
  idMap: Map<string, string>
  error?: string
}

export function applyProductionPlan(
  plan: ProductionPlan,
  offset = { x: 120, y: 120 },
): ApplyProductionPlanResult {
  if (plan.durationBudget.level === 'block') {
    return {
      nodes: [],
      edges: [],
      idMap: new Map(),
      error: `镜头总时长 ${plan.durationBudget.sumSec}s 与目标 ${plan.durationBudget.targetSec}s 偏差过大，请调整镜头表后再落盘。`,
    }
  }

  const { nodes, edges, idMap } = applyWorkflowPlan(plan.workflow, offset)

  const scriptNode = nodes.find((n) => n.type === 'script')
  const storyboardNode = nodes.find((n) => n.type === 'storyboard')

  if (scriptNode) {
    const scriptPlan = plan.workflow.nodes.find((n) => n.type === 'script')
    if (scriptPlan?.data) {
      scriptNode.data = { ...scriptNode.data, ...scriptPlan.data }
    }
  }

  if (storyboardNode) {
    storyboardNode.data = {
      ...storyboardNode.data,
      frames: [],
      layout: 'list',
      name: plan.brief.title,
    }
  }

  return { nodes, edges, idMap }
}
