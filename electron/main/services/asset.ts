import { join, extname, basename } from 'path'
import { existsSync, readdirSync, copyFileSync, statSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { getProjectAssetsPath } from './project'
import { logger } from './logger'

export type AssetType = 'image' | 'video' | 'audio'

export interface Asset {
  id: string
  name: string
  path: string
  absolutePath: string
  type: AssetType
  size: number
  modifiedAt: string
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.mkv'])
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac'])

function detectType(ext: string): AssetType | null {
  const lower = ext.toLowerCase()
  if (IMAGE_EXT.has(lower)) return 'image'
  if (VIDEO_EXT.has(lower)) return 'video'
  if (AUDIO_EXT.has(lower)) return 'audio'
  return null
}

function scanFolder(
  projectId: string,
  folder: string,
  type: AssetType,
): Asset[] {
  const base = getProjectAssetsPath(projectId)
  const dir = join(base, folder)
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .map((file) => {
      const ext = extname(file)
      if (detectType(ext) !== type) return null
      const absolutePath = join(dir, file)
      const stat = statSync(absolutePath)
      return {
        id: `${folder}/${file}`,
        name: file,
        path: `${folder}/${file}`,
        absolutePath,
        type,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      } satisfies Asset
    })
    .filter((a): a is Asset => a !== null)
}

export function listAssets(projectId: string): Asset[] {
  const assets = [
    ...scanFolder(projectId, 'images', 'image'),
    ...scanFolder(projectId, 'videos', 'video'),
    ...scanFolder(projectId, 'audios', 'audio'),
  ]
  return assets.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  )
}

export function importAsset(projectId: string, filePath: string): Asset {
  const ext = extname(filePath)
  const type = detectType(ext)
  if (!type) {
    throw new Error(`Unsupported file type: ${ext}`)
  }

  const folderMap: Record<AssetType, string> = {
    image: 'images',
    video: 'videos',
    audio: 'audios',
  }

  const folder = folderMap[type]
  const fileName = `${uuid()}${ext}`
  const relativePath = `${folder}/${fileName}`
  const dest = join(getProjectAssetsPath(projectId), relativePath)

  copyFileSync(filePath, dest)
  const stat = statSync(dest)
  logger.info('Asset imported', projectId, relativePath)

  return {
    id: relativePath,
    name: basename(filePath),
    path: relativePath,
    absolutePath: dest,
    type,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  }
}
