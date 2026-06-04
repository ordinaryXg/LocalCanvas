import type { Node } from '@xyflow/react'
import { generateId } from './id'

export type MediaKind = 'image' | 'video' | 'audio'

const MEDIA_CONFIG: Record<
  MediaKind,
  { pathKey: string; srcKey: string; folder: string }
> = {
  image: { pathKey: 'imageAssetPath', srcKey: 'imageSrc', folder: 'images' },
  video: { pathKey: 'videoAssetPath', srcKey: 'videoSrc', folder: 'videos' },
  audio: { pathKey: 'audioAssetPath', srcKey: 'audioSrc', folder: 'audios' },
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
}

export function mimeFromAssetPath(relativePath: string): string {
  const ext = relativePath.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

export function stripTransientMediaFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data }
  delete out.imageSrc
  delete out.videoSrc
  delete out.audioSrc
  delete out.referenceSrc
  delete out.firstFrameSrc
  delete out.lastFrameSrc
  return out
}

export async function assetPathToBlobUrl(
  projectId: string,
  relativePath: string,
): Promise<string> {
  const buffer = await window.api.file.readAsset(projectId, relativePath)
  const blob = new Blob([buffer], { type: mimeFromAssetPath(relativePath) })
  return URL.createObjectURL(blob)
}

export async function persistMediaFile(
  projectId: string,
  kind: MediaKind,
  file: File,
): Promise<{ relativePath: string; blobUrl: string }> {
  const { folder, pathKey } = MEDIA_CONFIG[kind]
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const relativePath = `${folder}/${generateId('asset')}.${ext}`
  const buffer = await file.arrayBuffer()
  await window.api.file.writeAsset(projectId, relativePath, buffer)
  const blobUrl = await assetPathToBlobUrl(projectId, relativePath)
  return { relativePath, blobUrl }
}

export async function dataUrlToAsset(
  projectId: string,
  kind: MediaKind,
  dataUrl: string,
  fileName?: string,
): Promise<{ relativePath: string; blobUrl: string }> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const ext =
    fileName?.split('.').pop() ??
    blob.type.split('/')[1]?.replace('jpeg', 'jpg') ??
    'bin'
  const file = new File([blob], fileName ?? `asset.${ext}`, { type: blob.type })
  return persistMediaFile(projectId, kind, file)
}

/** 保存前：将节点内 data/blob URL 写入 assets，返回可序列化的 data */
export async function ensureNodeAssetsOnDisk(
  projectId: string,
  nodes: Node[],
): Promise<Node[]> {
  const updated: Node[] = []

  for (const node of nodes) {
    let data = { ...node.data }

    for (const kind of ['image', 'video', 'audio'] as MediaKind[]) {
      const { pathKey, srcKey } = MEDIA_CONFIG[kind]
      const existingPath = data[pathKey] as string | undefined
      const src = data[srcKey] as string | undefined

      if (existingPath && typeof existingPath === 'string') continue

      if (!src || typeof src !== 'string') continue

      if (src.startsWith('data:') || src.startsWith('blob:')) {
        try {
          const { relativePath, blobUrl } = await dataUrlToAsset(
            projectId,
            kind,
            src,
            data.fileName as string | undefined,
          )
          data = { ...data, [pathKey]: relativePath, [srcKey]: blobUrl }
        } catch {
          // 保留原 data，避免保存失败丢数据
        }
      }
    }

    for (const key of ['referenceAssetPath', 'firstFrameAssetPath', 'lastFrameAssetPath'] as const) {
      const path = data[key] as string | undefined
      const srcKey =
        key === 'referenceAssetPath'
          ? 'referenceSrc'
          : key === 'firstFrameAssetPath'
            ? 'firstFrameSrc'
            : 'lastFrameSrc'
      const src = data[srcKey] as string | undefined
      if (path || !src || (!src.startsWith('data:') && !src.startsWith('blob:'))) continue
      const kind: MediaKind = 'image'
      try {
        const { relativePath, blobUrl } = await dataUrlToAsset(projectId, kind, src)
        data = { ...data, [key]: relativePath, [srcKey]: blobUrl }
      } catch {
        /* ignore */
      }
    }

    updated.push({ ...node, data })
  }

  return updated
}

export async function hydrateProjectNodes(
  projectId: string,
  nodes: Node[],
): Promise<Node[]> {
  const hydrated: Node[] = []

  for (const node of nodes) {
    let data = { ...node.data }

    for (const kind of ['image', 'video', 'audio'] as MediaKind[]) {
      const { pathKey, srcKey } = MEDIA_CONFIG[kind]
      const path = data[pathKey] as string | undefined
      if (!path) continue
      try {
        data[srcKey] = await assetPathToBlobUrl(projectId, path)
      } catch {
        /* 资源缺失时跳过 */
      }
    }

    const extraPaths: Array<{ pathKey: string; srcKey: string }> = [
      { pathKey: 'referenceAssetPath', srcKey: 'referenceSrc' },
      { pathKey: 'firstFrameAssetPath', srcKey: 'firstFrameSrc' },
      { pathKey: 'lastFrameAssetPath', srcKey: 'lastFrameSrc' },
    ]

    for (const { pathKey, srcKey } of extraPaths) {
      const path = data[pathKey] as string | undefined
      if (!path) continue
      try {
        data[srcKey] = await assetPathToBlobUrl(projectId, path)
      } catch {
        /* ignore */
      }
    }

    hydrated.push({ ...node, data })
  }

  return hydrated
}

export function getMediaBlobUrl(
  data: Record<string, unknown>,
  kind: MediaKind,
): string | undefined {
  const src = data[MEDIA_CONFIG[kind].srcKey]
  return typeof src === 'string' ? src : undefined
}
