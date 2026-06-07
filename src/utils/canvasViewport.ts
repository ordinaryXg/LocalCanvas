import type { Node, Viewport } from '@xyflow/react'
import type { ReactFlowInstance } from '@xyflow/react'

export async function fitViewAndSyncViewport(
  reactFlow: ReactFlowInstance,
  setViewport: (vp: Viewport, options?: { silent?: boolean }) => void,
  options?: { padding?: number; duration?: number },
): Promise<void> {
  await reactFlow.fitView({
    padding: options?.padding ?? 0.2,
    duration: options?.duration ?? 0,
  })
  setViewport(reactFlow.getViewport(), { silent: true })
}

/** 当前视口是否至少包含一个节点的可见区域 */
export function viewportLikelyShowsNodes(
  reactFlow: ReactFlowInstance,
  nodes: Node[],
  container: HTMLElement | null,
): boolean {
  if (nodes.length === 0 || !container) return true

  try {
    const bounds = reactFlow.getNodesBounds(nodes)
    if (bounds.width <= 0 && bounds.height <= 0) return false

    const tl = reactFlow.screenToFlowPosition({ x: 0, y: 0 })
    const br = reactFlow.screenToFlowPosition({
      x: container.clientWidth,
      y: container.clientHeight,
    })
    const minX = Math.min(tl.x, br.x)
    const maxX = Math.max(tl.x, br.x)
    const minY = Math.min(tl.y, br.y)
    const maxY = Math.max(tl.y, br.y)
    const nodeRight = bounds.x + bounds.width
    const nodeBottom = bounds.y + bounds.height

    return !(
      nodeRight < minX ||
      bounds.x > maxX ||
      nodeBottom < minY ||
      bounds.y > maxY
    )
  } catch {
    return false
  }
}

/** 将视口平移至指定节点并居中（不改变 zoom 上限） */
export async function focusNodeInView(
  reactFlow: ReactFlowInstance,
  nodeId: string,
  setViewport: (vp: Viewport, options?: { silent?: boolean }) => void,
  options?: { padding?: number; duration?: number; maxZoom?: number },
): Promise<void> {
  await reactFlow.fitView({
    nodes: [{ id: nodeId }],
    padding: options?.padding ?? 0.45,
    duration: options?.duration ?? 280,
    maxZoom: options?.maxZoom ?? 1.15,
  })
  setViewport(reactFlow.getViewport(), { silent: true })
}
