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
  return bufferToDataUrl(buffer, blob.type || 'application/octet-stream')
}

export type ApiMediaKind = 'image' | 'video' | 'audio'

const MEDIA_FIELD: Record<ApiMediaKind, { src: string; asset: string }> = {
  image: { src: 'imageSrc', asset: 'imageAssetPath' },
  video: { src: 'videoSrc', asset: 'videoAssetPath' },
  audio: { src: 'audioSrc', asset: 'audioAssetPath' },
}

/**
 * 将节点媒体字段转为 Utility / 远端 API 可接受的 data: 或 http(s) URL。
 */
export async function resolveMediaRefForApi(
  kind: ApiMediaKind,
  data: Record<string, unknown>,
  projectId: string | null | undefined,
): Promise<string | undefined> {
  const keys = MEDIA_FIELD[kind]
  const assetPath = data[keys.asset] as string | undefined
  const src = data[keys.src] as string | undefined

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
    const fileName = src.split(/[/\\]/).pop() ?? 'media.bin'
    return bufferToDataUrl(buffer, mimeFromAssetPath(fileName))
  }

  if (src && (/^[a-zA-Z]:[\\/]/.test(src) || src.startsWith('/'))) {
    const buffer = await window.api.file.readAbsolutePath(src)
    const fileName = src.split(/[/\\]/).pop() ?? 'media.bin'
    return bufferToDataUrl(buffer, mimeFromAssetPath(fileName))
  }

  return undefined
}

export async function resolveAbsolutePathToDataUrl(absolutePath: string): Promise<string | undefined> {
  try {
    const buffer = await window.api.file.readAbsolutePath(absolutePath)
    const fileName = absolutePath.split(/[/\\]/).pop() ?? 'media.bin'
    return bufferToDataUrl(buffer, mimeFromAssetPath(fileName))
  } catch {
    return undefined
  }
}

export async function resolveMediaRefFromNodeId(
  nodeId: string,
  nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>,
  projectId: string | null | undefined,
): Promise<string | undefined> {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return undefined

  if (node.type === 'compose') {
    const outputPath = node.data.outputPath
    if (typeof outputPath === 'string' && outputPath.length > 0) {
      return resolveAbsolutePathToDataUrl(outputPath)
    }
    return undefined
  }

  const kind: ApiMediaKind =
    node.type === 'video' ? 'video' : node.type === 'audio' ? 'audio' : 'image'

  return resolveMediaRefForApi(kind, node.data, projectId)
}
