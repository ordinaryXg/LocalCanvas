import type { AppConfig } from '../types/config'
import type { GraphPatch, PlannedNode } from '../types/agent'
import { enrichWorkflowPlanWithModels } from './agent-plan-enrich'

export function enrichGraphPatchWithModels(
  patch: GraphPatch,
  config: AppConfig,
): { patch: GraphPatch; warnings: string[] } {
  if (!patch.addNodes?.length) {
    return { patch, warnings: [] }
  }

  const miniPlan = {
    version: 1 as const,
    intent: patch.intent,
    summary: patch.summary,
    nodes: patch.addNodes,
    edges: patch.addEdges ?? [],
    executionMode: 'manual' as const,
    estimatedSteps: patch.addNodes.length,
  }

  const enriched = enrichWorkflowPlanWithModels(miniPlan, config)
  return {
    patch: { ...patch, addNodes: enriched.plan.nodes as PlannedNode[] },
    warnings: enriched.warnings,
  }
}
