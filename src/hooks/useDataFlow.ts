import { useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { computeDataFlowPatches } from '../utils/dataFlow'

/**
 * 监听连线变化，将源节点数据同步到目标节点（仅在值变化时写入，避免无限重渲染）
 */
export function useDataFlow(): void {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  useEffect(() => {
    const patches = computeDataFlowPatches(nodes, edges)
    for (const { nodeId, data } of patches) {
      updateNodeData(nodeId, data)
    }
  }, [edges, nodes, updateNodeData])
}
