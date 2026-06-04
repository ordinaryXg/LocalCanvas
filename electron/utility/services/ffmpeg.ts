import { exec } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { promisify } from 'util'
import { getVideoInfo, type VideoInfo } from './ffmpeg-service'
import { downloadAndInstallFfmpeg } from './ffmpeg-download'

const execAsync = promisify(exec)

let userDataPath = ''
let ffmpegPath: string | null = null
let configuredUserPath = ''

const FFMPEG_PATHS: Record<string, string> = {
  win32: 'ffmpeg.exe',
  darwin: 'ffmpeg',
  linux: 'ffmpeg',
}

export function initFfmpegPaths(dataPath: string, userPath?: string): void {
  userDataPath = dataPath
  configuredUserPath = userPath ?? ''
}

function getBuiltinPath(): string {
  const binName = FFMPEG_PATHS[process.platform] ?? 'ffmpeg'
  return join(userDataPath, 'LocalCanvas', 'bin', binName)
}

function getFfmpegDir(): string {
  return join(userDataPath, 'LocalCanvas', 'bin')
}

export async function detectFFmpeg(userPath?: string): Promise<string> {
  const configured = userPath ?? configuredUserPath

  if (configured && existsSync(configured)) {
    try {
      await execAsync(`"${configured}" -version`)
      ffmpegPath = configured
      return ffmpegPath
    } catch {
      throw new Error(`Configured FFmpeg path is invalid: ${configured}`)
    }
  }

  const builtinPath = getBuiltinPath()
  if (existsSync(builtinPath)) {
    ffmpegPath = builtinPath
    return ffmpegPath
  }

  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg'
    const { stdout } = await execAsync(cmd)
    const systemPath = stdout.trim().split('\n')[0]?.trim()
    if (systemPath && existsSync(systemPath)) {
      ffmpegPath = systemPath
      return ffmpegPath
    }
  } catch {
    /* not in PATH */
  }

  try {
    const { stdout } = await execAsync('ffmpeg -version')
    if (stdout.includes('ffmpeg version')) {
      ffmpegPath = 'ffmpeg'
      return ffmpegPath
    }
  } catch {
    /* unavailable */
  }

  throw new Error(
    'FFmpeg not found. Please install FFmpeg or configure its path in settings.',
  )
}

export async function downloadFFmpeg(
  onProgress?: (percentage: number) => void,
): Promise<string> {
  const targetPath = getBuiltinPath()
  mkdirSync(getFfmpegDir(), { recursive: true })

  try {
    const installed = await downloadAndInstallFfmpeg(getFfmpegDir(), targetPath, onProgress)
    ffmpegPath = installed
    configuredUserPath = installed
    return installed
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `FFmpeg download failed: ${message}. ` +
        'Please download manually from https://ffmpeg.org/download.html and configure the path in settings.',
    )
  }
}

export function getFFmpegPath(): string {
  if (!ffmpegPath) {
    throw new Error('FFmpeg not initialized. Call detectFFmpeg() first.')
  }
  return ffmpegPath
}

export async function validateConcatCompatibility(videoPaths: string[]): Promise<{
  compatible: boolean
  issues: string[]
}> {
  const issues: string[] = []
  const infoList: VideoInfo[] = []

  for (const path of videoPaths) {
    try {
      const info = await getVideoInfo(path)
      infoList.push(info)
    } catch (err) {
      issues.push(`Cannot read video: ${path} - ${err}`)
    }
  }

  if (infoList.length < 2) return { compatible: true, issues: [] }

  const first = infoList[0]
  for (let i = 1; i < infoList.length; i++) {
    const curr = infoList[i]
    if (curr.codec !== first.codec) {
      issues.push(
        `Codec mismatch: clip 1 is ${first.codec}, clip ${i + 1} is ${curr.codec}`,
      )
    }
    if (curr.width !== first.width || curr.height !== first.height) {
      issues.push(
        `Resolution mismatch: clip 1 is ${first.width}x${first.height}, clip ${i + 1} is ${curr.width}x${curr.height}`,
      )
    }
    if (Math.abs(curr.fps - first.fps) > 0.5) {
      issues.push(
        `FPS mismatch: clip 1 is ${first.fps}, clip ${i + 1} is ${curr.fps}`,
      )
    }
  }

  return { compatible: issues.length === 0, issues }
}
