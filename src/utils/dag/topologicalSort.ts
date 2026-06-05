export interface DagEdge {
  source: string
  target: string
}

export class DagCycleError extends Error {
  constructor(message = 'DAG contains a cycle') {
    super(message)
    this.name = 'DagCycleError'
  }
}

/** Kahn 算法拓扑排序；nodeIds 为参与排序的节点子集 */
export function topologicalSort(nodeIds: string[], edges: DagEdge[]): string[] {
  const idSet = new Set(nodeIds)
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adj.set(id, [])
  }

  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue
    adj.get(edge.source)!.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(id)
    for (const next of adj.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(next)
    }
  }

  if (sorted.length !== nodeIds.length) {
    throw new DagCycleError()
  }

  return sorted
}
