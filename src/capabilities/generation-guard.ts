import type { Edge } from '@xyflow/react'
import { listLlmVisionImageHandles } from '../utils/llmVisionSlots'
import { listVideoReferenceHandles } from '../utils/videoReferenceSlots'
import { collectInboundEdgeWarnings, type CanvasNodeRef } from './edge-compat'

export type GenerationGuardKind = 'text_llm' | 'image' | 'video' | 'audio'

/**
 * 本次生成动作会实际消费的入边 handle。
 * 未列入的虚线入边（如画布探索连线）仅视觉警告，不阻断生成。
 * 例：DeepSeek 不接收图片 → image→text:image 为虚线，但不影响「仅用草稿」的文本生成；
 * text→image:prompt 为出边，与文本节点生成无关。
 */
export const GENERATION_CONSUMED_HANDLES: Record<GenerationGuardKind, readonly string[]> = {
  text_llm: ['image', ...listLlmVisionImageHandles(20)],
  image: ['prompt', 'reference', ...listVideoReferenceHandles(14)],
  video: [
    'prompt',
    'firstFrame',
    'lastFrame',
    'video',
    'audio',
    ...listVideoReferenceHandles(9),
  ],
  audio: ['prompt'],
}

export class GenerationBlockedError extends Error {
  readonly warnings: string[]

  constructor(warnings: string[]) {
    super(
      warnings.length === 1
        ? warnings[0]
        : `存在 ${warnings.length} 条将影响本次生成的未验证连线：\n${warnings.join('\n')}`,
    )
    this.name = 'GenerationBlockedError'
    this.warnings = warnings
  }
}

export function assertNoWarnEdgesForNode(
  nodeId: string,
  nodes: CanvasNodeRef[],
  edges: Edge[],
  kind: GenerationGuardKind,
): void {
  const consumed = GENERATION_CONSUMED_HANDLES[kind]
  const warnings = collectInboundEdgeWarnings(nodeId, nodes, edges, consumed)
  if (warnings.length > 0) {
    throw new GenerationBlockedError(warnings)
  }
}
