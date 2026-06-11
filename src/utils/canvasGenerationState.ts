import type { Node } from '@xyflow/react'

/** 清除不应持久化的生成态字段（保存/加载时使用） */
export function clearTransientGenerationFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data }
  delete out.isGenerating
  delete out.progress
  delete out.error
  delete out.generatingKind

  if (Array.isArray(out.frames)) {
    out.frames = out.frames.map((frame) => {
      if (!frame || typeof frame !== 'object') return frame
      const f = { ...(frame as Record<string, unknown>) }
      if (f.status === 'generating') {
        f.status = 'empty'
      }
      return f
    })
  }

  return out
}

export function getGeneratingNodeIds(nodes: Node[]): string[] {
  return nodes
    .filter((n) => (n.data as Record<string, unknown> | undefined)?.isGenerating === true)
    .map((n) => n.id)
}

export function hasActiveNodeGenerations(nodes: Node[]): boolean {
  return getGeneratingNodeIds(nodes).length > 0
}

export function nodeHasActiveGeneration(node: Node): boolean {
  return (node.data as Record<string, unknown> | undefined)?.isGenerating === true
}

/** Agent 自动跑 DAG 前：画布上已有生成任务时不叠加新工作流 */
export function canAutoStartDagRun(
  nodes: Node[],
  dagAlreadyRunning: boolean,
): { ok: boolean; message?: string } {
  if (dagAlreadyRunning) {
    return { ok: false, message: '已有工作流在执行，请等待完成或暂停后再继续' }
  }
  if (hasActiveNodeGenerations(nodes)) {
    return { ok: false, message: '画布上有节点正在生成，请等待完成后再启动新工作流' }
  }
  return { ok: true }
}
