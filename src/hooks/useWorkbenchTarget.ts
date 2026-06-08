import { useMemo } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useComposeEditorStore } from '../stores/composeEditorStore'
import { resolveWorkbenchTarget, type WorkbenchTarget } from '../utils/workbenchTarget'

export function useWorkbenchTarget(): WorkbenchTarget | null {
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const activeComposeId = useComposeEditorStore((s) => s.activeNodeId)

  return useMemo(
    () => resolveWorkbenchTarget(nodes, selectedNodeIds, activeComposeId),
    [nodes, selectedNodeIds, activeComposeId],
  )
}
