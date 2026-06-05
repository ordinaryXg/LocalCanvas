import { statfsSync, statSync } from 'fs'
import { dirname } from 'path'
import { mkdirSync } from 'fs'

const MIN_FREE_BYTES = 100 * 1024 * 1024

export function getFreeDiskSpace(targetPath: string): number {
  try {
    const dir = dirname(targetPath)
    try {
      mkdirSync(dir, { recursive: true })
    } catch {
      /* dir may exist */
    }
    const stats = statfsSync(dir)
    return stats.bfree * stats.bsize
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

export function ensureDiskSpace(targetPath: string, requiredBytes: number): void {
  const free = getFreeDiskSpace(targetPath)
  const needed = Math.max(requiredBytes, MIN_FREE_BYTES)
  if (free < needed) {
    const freeMb = Math.round(free / 1024 / 1024)
    const needMb = Math.round(needed / 1024 / 1024)
    throw new Error(`磁盘空间不足（可用 ${freeMb} MB，需要约 ${needMb} MB），请清理后重试`)
  }
}

export function getFileSize(filePath: string): number {
  return statSync(filePath).size
}
