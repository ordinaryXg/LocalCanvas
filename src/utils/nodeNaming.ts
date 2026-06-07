import type { Node } from '@xyflow/react'

const TYPE_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  video: '视频',
  audio: '音频',
  script: '脚本',
  compose: '合成',
  storyboard: '分镜组',
  group: '分组',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 从已有节点标题中取同类型最大序号 */
export function nextDefaultNodeTitle(type: string, nodes: Node[]): string {
  const base = TYPE_LABELS[type] ?? type
  let maxNum = 0
  const numbered = new RegExp(`^${escapeRegExp(base)}\\s+(\\d+)$`)

  for (const node of nodes) {
    if (node.type !== type) continue
    const title = typeof node.data?.title === 'string' ? node.data.title : ''
    if (title === base) {
      maxNum = Math.max(maxNum, 1)
      continue
    }
    const match = title.match(numbered)
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10))
  }

  return `${base} ${maxNum + 1}`
}

export function withDefaultNodeTitle(
  type: string | undefined,
  nodes: Node[],
  data: Record<string, unknown> = {},
): Record<string, unknown> {
  if (typeof data.title === 'string' && data.title.trim()) return data
  return { ...data, title: nextDefaultNodeTitle(type ?? 'text', nodes) }
}

export function nodeDisplayTitle(node: Pick<Node, 'type' | 'data'>, fallback?: string): string {
  const title = node.data?.title
  if (typeof title === 'string' && title.trim()) return title
  if (fallback) return fallback
  return TYPE_LABELS[node.type ?? ''] ?? node.type ?? '节点'
}
