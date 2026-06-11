import type { Node } from '@xyflow/react'

/** React Flow 要求 parent 节点排在 child 之前，否则控制台告警且分组可能异常 */
export function sortNodesForReactFlow<T extends { id: string; parentId?: string | null }>(
  nodes: T[],
): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const result: T[] = []
  const added = new Set<string>()

  const visit = (node: T) => {
    if (added.has(node.id)) return
    const parentId = node.parentId
    if (parentId && byId.has(parentId) && !added.has(parentId)) {
      visit(byId.get(parentId)!)
    }
    added.add(node.id)
    result.push(node)
  }

  for (const node of nodes) visit(node)
  return result
}

export function sortCanvasNodes(nodes: Node[]): Node[] {
  return sortNodesForReactFlow(nodes)
}
