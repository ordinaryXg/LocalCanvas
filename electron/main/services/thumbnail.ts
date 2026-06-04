import { join } from 'path'
import { existsSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { app } from 'electron'
import { getUtilityClient } from './utility-client'

const THUMB_DIR = join(app.getPath('userData'), 'LocalCanvas', 'thumbnails')
const thumbCache = new Map<string, string>()

export async function getThumbnail(filePath: string): Promise<string> {
  if (thumbCache.has(filePath)) return thumbCache.get(filePath)!

  const stat = statSync(filePath)
  const cacheKey = `${filePath}-${stat.mtimeMs}`
  const cachePath = join(
    THUMB_DIR,
    `${createHash('md5').update(cacheKey).digest('hex')}.jpg`,
  )

  if (existsSync(cachePath)) {
    thumbCache.set(filePath, cachePath)
    return cachePath
  }

  const thumbPath = await getUtilityClient().generateThumbnail(filePath, 0.5, cachePath)
  thumbCache.set(filePath, thumbPath)
  return thumbPath
}
