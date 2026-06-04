import { useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'

function valuesEqual(a: unknown, b: unknown): boolean {
  return (a ?? '') === (b ?? '')
}

/**
 * 监听连线变化，将源节点数据同步到目标节点（仅在值变化时写入，避免无限重渲染）
 */
export function useDataFlow(): void {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  useEffect(() => {
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      const targetNode = nodes.find((n) => n.id === edge.target)
      if (!sourceNode || !targetNode) continue

      const targetHandle = edge.targetHandle

      if (sourceNode.type === 'text' && targetHandle === 'prompt') {
        if (targetNode.type === 'image' || targetNode.type === 'video') {
          const content = sourceNode.data.content
          if (!valuesEqual(targetNode.data.prompt, content)) {
            updateNodeData(targetNode.id, { prompt: content ?? '' })
          }
        }
      }

      if (sourceNode.type === 'image' && targetNode.type === 'video') {
        if (targetHandle === 'firstFrame') {
          const imageSrc = sourceNode.data.imageSrc
          if (!valuesEqual(targetNode.data.firstFrameSrc, imageSrc)) {
            updateNodeData(targetNode.id, { firstFrameSrc: imageSrc })
          }
        }
        if (targetHandle === 'lastFrame') {
          const imageSrc = sourceNode.data.imageSrc
          if (!valuesEqual(targetNode.data.lastFrameSrc, imageSrc)) {
            updateNodeData(targetNode.id, { lastFrameSrc: imageSrc })
          }
        }
      }

      if (sourceNode.type === 'audio' && targetNode.type === 'video' && targetHandle === 'audio') {
        const audioSrc = sourceNode.data.audioSrc
        if (!valuesEqual(targetNode.data.audioSrc, audioSrc)) {
          updateNodeData(targetNode.id, { audioSrc })
        }
      }
    }
  }, [edges, nodes, updateNodeData])
}
