const REFERENCE_HANDLE_RE = /^reference(\d+)$/

/** 视频节点参考图入边 handle：reference1 … reference9 */
export function isVideoReferenceImageHandle(handle: string | null | undefined): boolean {
  return !!handle && REFERENCE_HANDLE_RE.test(handle)
}

export function videoReferenceHandleFromIndex(index: number): string {
  return `reference${index + 1}`
}

export function listVideoReferenceHandles(max = 9): string[] {
  const n = Math.max(0, Math.min(9, max))
  return Array.from({ length: n }, (_, i) => videoReferenceHandleFromIndex(i))
}

export function referenceIndexFromHandle(handle: string): number {
  const m = handle.match(REFERENCE_HANDLE_RE)
  return m ? parseInt(m[1], 10) - 1 : -1
}

export function countVideoReferenceEdges(
  edges: Array<{ target: string; targetHandle?: string | null }>,
  targetNodeId: string,
): number {
  return edges.filter(
    (e) => e.target === targetNodeId && isVideoReferenceImageHandle(e.targetHandle),
  ).length
}

/** 图像节点参考图：单槽 `reference` 或多槽 `reference1…referenceN` */
export function isImageReferenceHandle(handle: string | null | undefined): boolean {
  return !!handle && (handle === 'reference' || isVideoReferenceImageHandle(handle))
}

export function listImageReferenceEdges<
  T extends { id: string; source: string; target: string; targetHandle?: string | null },
>(edges: T[], targetNodeId: string): T[] {
  return edges
    .filter((e) => e.target === targetNodeId && isImageReferenceHandle(e.targetHandle))
    .sort((a, b) => {
      const indexA =
        a.targetHandle === 'reference' ? 0 : referenceIndexFromHandle(a.targetHandle ?? '')
      const indexB =
        b.targetHandle === 'reference' ? 0 : referenceIndexFromHandle(b.targetHandle ?? '')
      return indexA - indexB
    })
}
