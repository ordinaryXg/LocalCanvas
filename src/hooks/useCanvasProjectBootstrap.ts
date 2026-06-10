import { useEffect, useRef } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import type { Node, Edge, Viewport } from '@xyflow/react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { fitViewAndSyncViewport, focusNodeInView, viewportLikelyShowsNodes } from '../utils/canvasViewport'
import { hydrateProjectNodes } from '../utils/assetStorage'

interface UseCanvasProjectBootstrapOptions {
  nodes: Node[]
  viewport: Viewport
  reactFlow: ReactFlowInstance
  canvasRef: React.RefObject<HTMLDivElement | null>
  setViewport: (viewport: Viewport, options?: { silent?: boolean }) => void
  loadProject: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void
  focusNodeRequestId: string | null
  clearFocusNodeRequest: () => void
}

export function useCanvasProjectBootstrap({
  nodes,
  viewport,
  reactFlow,
  canvasRef,
  setViewport,
  loadProject,
  focusNodeRequestId,
  clearFocusNodeRequest,
}: UseCanvasProjectBootstrapOptions) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const bootstrappedProjectRef = useRef<string | null>(null)
  const reloadAttemptedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!focusNodeRequestId) return
    const exists = nodes.some((n) => n.id === focusNodeRequestId)
    if (!exists) {
      clearFocusNodeRequest()
      return
    }
    void focusNodeInView(reactFlow, focusNodeRequestId, setViewport).finally(() => {
      clearFocusNodeRequest()
    })
  }, [focusNodeRequestId, nodes, reactFlow, setViewport, clearFocusNodeRequest])

  useEffect(() => {
    if (!currentProjectId) {
      bootstrappedProjectRef.current = null
      reloadAttemptedRef.current = null
      return
    }

    if (nodes.length === 0) {
      if (reloadAttemptedRef.current === currentProjectId) return
      reloadAttemptedRef.current = currentProjectId
      void (async () => {
        try {
          const data = await window.api.project.load(currentProjectId)
          const rawNodes = data.nodes as Node[]
          if (rawNodes.length === 0) return
          const hydrated = await hydrateProjectNodes(currentProjectId, rawNodes)
          loadProject(hydrated, data.edges as Edge[], data.viewport)
        } catch {
          /* 由 openProject 负责主流程，此处仅兜底 */
        }
      })()
      return
    }

    if (bootstrappedProjectRef.current === currentProjectId) return

    const frame = requestAnimationFrame(() => {
      void (async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const latestNodes = useCanvasStore.getState().nodes
        if (!viewportLikelyShowsNodes(reactFlow, latestNodes, canvasRef.current)) {
          await fitViewAndSyncViewport(reactFlow, setViewport, { duration: 0 })
        } else {
          await reactFlow.setViewport(viewport, { duration: 0 })
        }
        bootstrappedProjectRef.current = currentProjectId
      })()
    })

    return () => cancelAnimationFrame(frame)
  }, [currentProjectId, nodes.length, loadProject, reactFlow, setViewport, viewport, canvasRef])
}
