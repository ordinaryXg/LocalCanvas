import { mimeFromAssetPath } from './assetStorage'

function bufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:${mime};base64,${btoa(binary)}`
}

function fileUrlToPath(url: string): string {
  let path = decodeURIComponent(url.replace(/^file:\/\/\/?/, ''))
  if (/^\/[a-zA-Z]:/.test(path)) path = path.slice(1)
  return path
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl)
  const blob = await res.blob()
  const buffer = await blob.arrayBuffer()
  return bufferToDataUrl(buffer, blob.type || 'image/png')
}

/**
 * 将画布图片引用转为 Utility / Seedance 可接受的 data: URL 或 http(s) URL。
 * blob: 仅在渲染进程可读，必须在 IPC 前转换。
 */
export async function resolveImageRefForApi(
  data: Record<string, unknown>,
  projectId: string | null | undefined,
): Promise<string | undefined> {
  const assetPath = (data.imageAssetPath ?? data.referenceAssetPath) as string | undefined
  const src = (data.imageSrc ?? data.referenceSrc) as string | undefined

  if (!src && !assetPath) return undefined

  if (projectId && assetPath) {
    try {
      const buffer = await window.api.file.readAsset(projectId, assetPath)
      return bufferToDataUrl(buffer, mimeFromAssetPath(assetPath))
    } catch {
      /* 回退到 src */
    }
  }

  if (src?.startsWith('data:') || src?.startsWith('http://') || src?.startsWith('https://')) {
    return src
  }

  if (src?.startsWith('blob:')) {
    return blobUrlToDataUrl(src)
  }

  if (src?.startsWith('file://')) {
    const buffer = await window.api.file.readAbsolutePath(fileUrlToPath(src))
    const fileName = src.split(/[/\\]/).pop() ?? 'image.png'
    return bufferToDataUrl(buffer, mimeFromAssetPath(fileName))
  }

  if (src && (/^[a-zA-Z]:[\\/]/.test(src) || src.startsWith('/'))) {
    const buffer = await window.api.file.readAbsolutePath(src)
    const fileName = src.split(/[/\\]/).pop() ?? 'image.png'
    return bufferToDataUrl(buffer, mimeFromAssetPath(fileName))
  }

  return undefined
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
