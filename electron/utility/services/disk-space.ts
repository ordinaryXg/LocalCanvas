import { statfsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const MIN_FREE_BYTES = 100 * 1024 * 1024

export function ensureDiskSpace(targetPath: string, requiredBytes: number): void {
  const dir = dirname(targetPath)
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    /* dir may exist */
  }

  try {
    const stats = statfsSync(dir)
    const free = stats.bfree * stats.bsize
    const needed = Math.max(requiredBytes, MIN_FREE_BYTES)
    if (free < needed) {
      const freeMb = Math.round(free / 1024 / 1024)
      const needMb = Math.round(needed / 1024 / 1024)
      throw new Error(`磁盘空间不足（可用 ${freeMb} MB，需要约 ${needMb} MB），请清理后重试`)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('磁盘空间不足')) {
      throw error
    }
    /* statfs unavailable — skip check */
  }
}
