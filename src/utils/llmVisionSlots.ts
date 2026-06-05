const VISION_IMAGE_HANDLE_RE = /^image(\d+)$/

/** 文本节点 Vision 入边：legacy `image` 或 image1 … image20 */
export function isLlmVisionImageHandle(handle: string | null | undefined): boolean {
  return handle === 'image' || (!!handle && VISION_IMAGE_HANDLE_RE.test(handle))
}

export function llmVisionImageHandleFromIndex(index: number): string {
  return `image${index + 1}`
}

export function listLlmVisionImageHandles(max = 10): string[] {
  const n = Math.max(0, Math.min(20, max))
  return Array.from({ length: n }, (_, i) => llmVisionImageHandleFromIndex(i))
}

export function visionImageIndexFromHandle(handle: string): number {
  if (handle === 'image') return 0
  const m = handle.match(VISION_IMAGE_HANDLE_RE)
  return m ? parseInt(m[1], 10) - 1 : -1
}

export function countLlmVisionImageEdges(
  edges: Array<{ target: string; targetHandle?: string | null }>,
  targetNodeId: string,
): number {
  return edges.filter(
    (e) => e.target === targetNodeId && isLlmVisionImageHandle(e.targetHandle),
  ).length
}
