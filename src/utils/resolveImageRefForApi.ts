import { resolveMediaRefForApi } from './resolveMediaRefForApi'

/**
 * 将画布图片引用转为 Utility / Seedance 可接受的 data: URL 或 http(s) URL。
 * blob: 仅在渲染进程可读，必须在 IPC 前转换。
 */
export async function resolveImageRefForApi(
  data: Record<string, unknown>,
  projectId: string | null | undefined,
): Promise<string | undefined> {
  const merged = {
    ...data,
    imageSrc: data.imageSrc ?? data.referenceSrc,
    imageAssetPath: data.imageAssetPath ?? data.referenceAssetPath,
  }
  return resolveMediaRefForApi('image', merged, projectId)
}

export async function resolveImageRefFromNodeId(
  nodeId: string,
  nodes: Array<{ id: string; data: Record<string, unknown> }>,
  projectId: string | null | undefined,
): Promise<string | undefined> {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return undefined
  return resolveImageRefForApi(node.data, projectId)
}
