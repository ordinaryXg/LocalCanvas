import { useMemo } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { normalizeTextNodeData } from '../utils/textNodeOutput'
import type { TextNodeData } from '../types/node'

export function useTextNodeData(nodeId: string): TextNodeData | null {
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId))
  return useMemo(() => {
    if (!node || node.type !== 'text') return null
    return normalizeTextNodeData((node.data ?? {}) as Record<string, unknown>)
  }, [node])
}
