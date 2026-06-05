import type { WorkflowPlan, PlannedNode, PlannedEdge } from '../types/agent'
import type { AppConfig } from '../types/config'
import type { ModelKind } from '../types/capability'
import { isLlmVisionImageHandle } from '../utils/llmVisionSlots'
import { isVideoReferenceImageHandle } from '../utils/videoReferenceSlots'
import {
  type ImageRequirement,
  type LlmRequirement,
  type ModelRequirement,
  type VideoRequirement,
  selectModelForRequirement,
} from './agent-model-select'

export interface EnrichPlanResult {
  plan: WorkflowPlan
  selections: Array<{ tempId: string; configId: string; name: string; reason?: string }>
  warnings: string[]
}

function nodeKind(type: PlannedNode['type']): ModelKind | null {
  if (type === 'text' || type === 'script') return 'llm'
  if (type === 'image') return 'image'
  if (type === 'video') return 'video'
  if (type === 'audio') return 'tts'
  return null
}

export function inferNodeRequirement(
  node: PlannedNode,
  edges: PlannedEdge[],
): ModelRequirement | null {
  const inbound = edges.filter((e) => e.target === node.tempId)

  if (node.type === 'text') {
    const req: LlmRequirement = {
      kind: 'llm',
      needsVision: inbound.some((e) => isLlmVisionImageHandle(e.targetHandle)),
    }
    return req
  }

  if (node.type === 'image') {
    const req: ImageRequirement = {
      kind: 'image',
      needsReference: inbound.some((e) => e.targetHandle === 'reference'),
    }
    return req
  }

  if (node.type === 'video') {
    const req: VideoRequirement = {
      kind: 'video',
      needsFirstFrame: inbound.some((e) => e.targetHandle === 'firstFrame'),
      needsLastFrame: inbound.some((e) => e.targetHandle === 'lastFrame'),
      needsReferenceImage: inbound.some((e) =>
        isVideoReferenceImageHandle(e.targetHandle),
      ),
      needsReferenceVideo: inbound.some((e) => e.targetHandle === 'video'),
      needsReferenceAudio: inbound.some((e) => e.targetHandle === 'audio'),
    }
    return req
  }

  return null
}

export function enrichWorkflowPlanWithModels(
  plan: WorkflowPlan,
  config: AppConfig,
): EnrichPlanResult {
  const selections: EnrichPlanResult['selections'] = []
  const warnings: string[] = []

  const nodes = plan.nodes.map((node) => {
    const kind = nodeKind(node.type)
    if (!kind) return node

    const requirement = inferNodeRequirement(node, plan.edges)
    if (!requirement) return node

    const preferred =
      (typeof node.data.modelId === 'string' && node.data.modelId) ||
      node.modelHint ||
      undefined

    const selected = selectModelForRequirement(config, requirement, preferred)
    if (!selected) {
      warnings.push(`${node.label ?? node.tempId}：未找到已接入的${kind}模型`)
      return node
    }

    if (selected.reason) {
      warnings.push(`${node.label ?? node.tempId}：${selected.reason} → ${selected.name}`)
    }

    selections.push({
      tempId: node.tempId,
      configId: selected.configId,
      name: selected.name,
      reason: selected.reason,
    })

    return {
      ...node,
      modelHint: selected.configId,
      data: { ...node.data, modelId: selected.configId },
    }
  })

  let summary = plan.summary
  if (selections.length > 0) {
    const picks = selections.map((s) => `${s.name}`).join('、')
    summary = `${plan.summary}（已选模：${picks}）`
  }

  return {
    plan: { ...plan, nodes, summary },
    selections,
    warnings,
  }
}
