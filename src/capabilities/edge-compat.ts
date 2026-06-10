import type { Edge } from '@xyflow/react'
import { isPortCompatible, normalizeImageSourceHandle } from '../utils/portCompat'
import {
  countLlmVisionImageEdges,
  isLlmVisionImageHandle,
} from '../utils/llmVisionSlots'
import {
  countVideoReferenceEdges,
  isVideoReferenceImageHandle,
} from '../utils/videoReferenceSlots'
import { resolveProfile } from './registry'
import { sourceHandleToModality, targetHandleToSlotId } from './handle-slots'
import type { EdgeCompatResult, ModelCapabilityProfile, ModelKind } from '../types/capability'

/** 目标节点未选模型时，用 P0 默认 profile 评估（避免一律虚线） */
const DEFAULT_CONFIG_ID_BY_KIND: Partial<Record<ModelKind, string>> = {
  image: 'seedream-4-5',
  video: 'seedance-1-0-pro-fast',
}

const profileResolveCache = new Map<string, ModelCapabilityProfile>()

function cacheKeyForProfile(
  targetModelId: string | undefined,
  targetApiModel: string | undefined,
  targetKind: ModelKind,
): string {
  return `${targetModelId ?? ''}|${targetApiModel ?? ''}|${targetKind}`
}

function resolveTargetProfile(
  targetModelId: string | undefined,
  targetApiModel: string | undefined,
  targetKind: ModelKind,
): ModelCapabilityProfile {
  const key = cacheKeyForProfile(targetModelId, targetApiModel, targetKind)
  const cached = profileResolveCache.get(key)
  if (cached) return cached
  const profile = resolveProfile({
    configId: targetModelId || DEFAULT_CONFIG_ID_BY_KIND[targetKind],
    model: targetApiModel,
    kind: targetKind,
  })
  profileResolveCache.set(key, profile)
  return profile
}

export function clearEdgeCompatProfileCache(): void {
  profileResolveCache.clear()
}

export interface EvaluateEdgeCompatInput {
  sourceType?: string
  sourceHandle?: string | null
  targetType?: string
  targetHandle?: string | null
  targetModelId?: string
  targetApiModel?: string
  targetKind?: ModelKind
  edges?: Edge[]
  targetNodeId?: string
  /** 重算已有连线样式时排除自身，避免「唯一合法入线」被误判为槽位已满 */
  excludeEdgeId?: string
}

function countEdgesToSlot(
  edges: Edge[],
  targetNodeId: string,
  targetHandle: string,
  excludeEdgeId?: string,
): number {
  return edges.filter(
    (e) =>
      e.target === targetNodeId &&
      e.targetHandle === targetHandle &&
      e.id !== excludeEdgeId,
  ).length
}

function findSlotForModality(
  profile: ModelCapabilityProfile,
  modality: string,
  slotId: string | null,
): { slot: ModelCapabilityProfile['inputs'][0]; inferred: boolean } | null {
  if (slotId) {
    const exact = profile.inputs.find((s) => s.id === slotId && s.modality === modality)
    if (exact) return { slot: exact, inferred: false }
  }
  const fallback = profile.inputs.find((s) => s.modality === modality)
  if (fallback) return { slot: fallback, inferred: profile.confidence !== 'verified' }
  return null
}

export function evaluateEdgeCompat(input: EvaluateEdgeCompatInput): EdgeCompatResult {
  const {
    sourceType,
    sourceHandle,
    targetType,
    targetHandle,
    targetModelId,
    targetApiModel,
    targetKind = 'llm',
    edges = [],
    targetNodeId,
    excludeEdgeId,
  } = input

  if (
    !isPortCompatible(sourceType, sourceHandle, targetType, targetHandle)
  ) {
    return { status: 'reject', reason: '节点类型不兼容' }
  }

  // 合成节点无 modelId / 能力 profile，端口拓扑兼容即视为合法实线
  if (targetType === 'compose') {
    return { status: 'solid' }
  }

  const modality = sourceHandleToModality(
    sourceType,
    normalizeImageSourceHandle(sourceType, sourceHandle) ?? sourceHandle,
  )
  if (!modality) {
    return { status: 'reject', reason: '无法识别上游数据类型' }
  }

  const profile = resolveTargetProfile(targetModelId, targetApiModel, targetKind)

  const slotId = targetHandleToSlotId(targetType, targetHandle)
  const match = findSlotForModality(profile, modality, slotId)

  if (!match) {
    if (profile.confidence === 'inferred' || profile.confidence === 'unknown') {
      return {
        status: 'dashed_warn',
        reason: `能力未验证：${profile.display_name} 可能不接受${modality}输入`,
      }
    }
    return {
      status: 'dashed_warn',
      reason: `${profile.display_name} 不接受此类型输入（${modality}）`,
    }
  }

  const { slot, inferred } = match

  if (targetNodeId && targetHandle && slot.max_count > 0) {
    const pool = excludeEdgeId ? edges.filter((e) => e.id !== excludeEdgeId) : edges
    const existing =
      slot.id === 'reference_image' && isVideoReferenceImageHandle(targetHandle)
        ? countVideoReferenceEdges(pool, targetNodeId)
        : slot.id === 'image' && isLlmVisionImageHandle(targetHandle)
          ? countLlmVisionImageEdges(pool, targetNodeId)
          : countEdgesToSlot(pool, targetNodeId, targetHandle)
    if (existing >= slot.max_count) {
      return {
        status: 'dashed_warn',
        reason: `${profile.display_name} 的 ${slot.id} 最多 ${slot.max_count} 路，已满`,
      }
    }
  }

  // 仅「槽位模糊匹配」或「未知模型」虚线；精确匹配（如 text→prompt）不因 profile 为 inferred 而虚线
  if (inferred) {
    return {
      status: 'dashed_warn',
      reason: `能力未完全验证：${profile.display_name}`,
    }
  }

  if (profile.confidence === 'unknown') {
    return {
      status: 'dashed_warn',
      reason: `能力未验证：${profile.display_name}`,
    }
  }

  return { status: 'solid' }
}

export interface CanvasNodeRef {
  id: string
  type?: string
  data?: Record<string, unknown>
}

function kindForNodeType(type?: string): ModelKind {
  if (type === 'image') return 'image'
  if (type === 'video') return 'video'
  if (type === 'audio') return 'text'
  if (type === 'text' || type === 'script') return 'llm'
  return 'llm'
}

export function collectInboundEdgeWarnings(
  nodeId: string,
  nodes: CanvasNodeRef[],
  edges: Edge[],
  /** 仅检查本次生成会读取的入边；空数组表示不检查任何入边 */
  consumedTargetHandles?: readonly string[],
): string[] {
  const warnings: string[] = []
  const targetNode = nodes.find((n) => n.id === nodeId)
  if (!targetNode) return warnings

  if (consumedTargetHandles && consumedTargetHandles.length === 0) {
    return warnings
  }

  const inbound = edges.filter((e) => e.target === nodeId)
  for (const edge of inbound) {
    if (
      consumedTargetHandles?.length &&
      edge.targetHandle &&
      !consumedTargetHandles.includes(edge.targetHandle)
    ) {
      continue
    }
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const result = evaluateEdgeCompat({
      sourceType: sourceNode?.type,
      sourceHandle: edge.sourceHandle,
      targetType: targetNode.type,
      targetHandle: edge.targetHandle,
      targetModelId: targetNode.data?.modelId as string | undefined,
      targetApiModel: targetNode.data?.apiModel as string | undefined,
      targetKind: kindForNodeType(targetNode.type),
      edges,
      targetNodeId: nodeId,
      excludeEdgeId: edge.id,
    })
    if (result.status === 'dashed_warn' && result.reason) {
      warnings.push(result.reason)
    }
  }
  return warnings
}
