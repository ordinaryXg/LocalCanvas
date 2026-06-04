import { generateId } from './id'
import {
  assetPathToBlobUrl,
  mimeFromAssetPath,
  type MediaKind,
} from './assetStorage'

const MEDIA_FOLDER: Record<MediaKind, string> = {
  image: 'images',
  video: 'videos',
  audio: 'audios',
}

export async function localPathToBlobUrl(absolutePath: string): Promise<string> {
  const buffer = await window.api.file.readAbsolutePath(absolutePath)
  const fileName = absolutePath.split(/[/\\]/).pop() ?? 'output.bin'
  const mime = mimeFromAssetPath(fileName)
  const blob = new Blob([buffer], { type: mime })
  return URL.createObjectURL(blob)
}

export async function importGeneratedMedia(
  projectId: string | null | undefined,
  kind: MediaKind,
  absolutePath: string,
): Promise<{ src: string; assetPath?: string; fileName: string }> {
  const fileName = absolutePath.split(/[/\\]/).pop() ?? 'output.bin'

  if (projectId) {
    const buffer = await window.api.file.readAbsolutePath(absolutePath)
    const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin'
    const relativePath = `${MEDIA_FOLDER[kind]}/${generateId('gen')}.${ext}`
    await window.api.file.writeAsset(projectId, relativePath, buffer)
    const src = await assetPathToBlobUrl(projectId, relativePath)
    return { src, assetPath: relativePath, fileName }
  }

  const src = await localPathToBlobUrl(absolutePath)
  return { src, fileName }
}
