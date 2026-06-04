import { useEffect, useMemo } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { computeDataFlowPatches } from '../utils/dataFlow'

function dataFlowSourceSignature(
  nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): string {
  return nodes
    .filter((n) => n.type === 'text' || n.type === 'script' || n.type === 'image' || n.type === 'audio')
    .map((n) => {
      const d = n.data
      if (n.type === 'text') return `${n.id}:${d.content ?? ''}`
      if (n.type === 'script') {
        const rows = (d.scriptRows as Array<{ prompt?: string }> | undefined) ?? []
        const prompts = rows.map((r) => r.prompt ?? '').join('|')
        return `${n.id}:${d.storyInput ?? ''}:${prompts}`
      }
      if (n.type === 'image') {
        return `${n.id}:${d.imageSrc ?? ''}:${d.referenceSrc ?? ''}:${d.imageAssetPath ?? ''}:${d.referenceAssetPath ?? ''}`
      }
      if (n.type === 'audio') {
        return `${n.id}:${d.audioSrc ?? ''}:${d.audioAssetPath ?? ''}`
      }
      return n.id
    })
    .join(';')
}

/**
 * 监听连线变化，将源节点数据同步到目标节点（仅在值变化时写入，避免无限重渲染）
 */
export function useDataFlow(): void {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const applyDataFlowPatches = useCanvasStore((s) => s.applyDataFlowPatches)

  const edgeKey = useMemo(
    () => edges.map((e) => `${e.id}:${e.source}:${e.target}:${e.sourceHandle}:${e.targetHandle}`).join('|'),
    [edges],
  )
  const sourceKey = useMemo(() => dataFlowSourceSignature(nodes), [nodes])

  useEffect(() => {
    const latestNodes = useCanvasStore.getState().nodes
    const latestEdges = useCanvasStore.getState().edges
    const patches = computeDataFlowPatches(latestNodes, latestEdges)
    applyDataFlowPatches(patches)
  }, [edgeKey, sourceKey, applyDataFlowPatches])
}
