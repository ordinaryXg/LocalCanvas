import type { Edge } from '@xyflow/react'
import { isLlmVisionImageHandle, visionImageIndexFromHandle } from './llmVisionSlots'
import { resolveImageRefFromNodeId } from './resolveImageRefForApi'

export async function collectLlmVisionImagesFromEdges(
  nodeId: string,
  nodes: Array<{ id: string; data: Record<string, unknown> }>,
  edges: Edge[],
  projectId: string | null | undefined,
): Promise<string[]> {
  const imageEdges = edges
    .filter(
      (e) =>
        e.target === nodeId &&
        e.targetHandle &&
        isLlmVisionImageHandle(e.targetHandle),
    )
    .sort(
      (a, b) =>
        visionImageIndexFromHandle(a.targetHandle!) -
        visionImageIndexFromHandle(b.targetHandle!),
    )

  const urls = await Promise.all(
    imageEdges.map((edge) => resolveImageRefFromNodeId(edge.source, nodes, projectId)),
  )
  return urls.filter((url): url is string => !!url)
}
