import { join } from 'path'
import { mkdirSync, existsSync, unlinkSync, renameSync } from 'fs'
import { v4 as uuid } from 'uuid'
import {
  concatVideos,
  concatVideosReencode,
  mergeAudioVideo,
  cleanupTemp,
  getVideoInfo,
} from './ffmpeg-service'
import { burnSubtitles } from './ffmpeg-subtitle'
import { validateConcatCompatibility } from './ffmpeg'
import { ensureDiskSpace } from './disk-space'
import { statSync } from 'fs'

let userDataPath = ''
let composeCancelled = false

export function initComposeService(dataPath: string): void {
  userDataPath = dataPath
}

export function cancelCompose(): void {
  composeCancelled = true
}

function getOutputDir(): string {
  return join(userDataPath, 'LocalCanvas', 'outputs')
}

function getTempDir(): string {
  return join(userDataPath, 'LocalCanvas', '.temp')
}

export interface ComposeClip {
  id: string
  path: string
  startTime: number
  duration: number
}

export interface ComposeOptions {
  clips: ComposeClip[]
  audioPath?: string
  subtitlePath?: string
  burnSubtitles?: boolean
  outputName?: string
  reencode?: boolean
}

export async function compose(
  options: ComposeOptions,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  composeCancelled = false
  mkdirSync(getOutputDir(), { recursive: true })
  mkdirSync(getTempDir(), { recursive: true })

  const { clips, audioPath, subtitlePath, burnSubtitles: shouldBurnSubtitles, outputName } = options
  let { reencode = false } = options

  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)
  const videoPaths = sortedClips.map((c) => c.path)

  if (videoPaths.length === 0) {
    throw new Error('No video clips to compose')
  }

  let estimatedBytes = 100 * 1024 * 1024
  for (const clip of sortedClips) {
    try {
      estimatedBytes += statSync(clip.path).size
    } catch {
      estimatedBytes += 50 * 1024 * 1024
    }
  }
  let outputFileName = outputName || `LocalCanvas_${Date.now()}.mp4`
  ensureDiskSpace(join(getOutputDir(), outputFileName), estimatedBytes)

  if (!reencode) {
    const { compatible, issues } = await validateConcatCompatibility(videoPaths)
    if (!compatible) {
      reencode = true
      console.warn('Video codec mismatch, falling back to re-encode', issues)
    }
  }

  if (composeCancelled) throw new Error('Compose cancelled')

  onProgress?.(10)
  const concatOutput = join(getTempDir(), `concat-${uuid()}.mp4`)

  if (reencode) {
    await concatVideosReencode(videoPaths, concatOutput, (p) =>
      onProgress?.(10 + p * 0.6),
    )
  } else {
    await concatVideos(videoPaths, concatOutput, (p) => onProgress?.(10 + p * 0.6))
  }

  if (composeCancelled) throw new Error('Compose cancelled')

  onProgress?.(80)
  let finalOutput = concatOutput

  if (audioPath && existsSync(audioPath)) {
    const mergedOutput = join(getTempDir(), `merged-${uuid()}.mp4`)
    await mergeAudioVideo(concatOutput, audioPath, mergedOutput)
    finalOutput = mergedOutput
    if (finalOutput !== concatOutput) {
      try {
        unlinkSync(concatOutput)
      } catch {
        /* ignore */
      }
    }
  }

  let outputPath = join(getOutputDir(), outputFileName)

  if (
    shouldBurnSubtitles &&
    subtitlePath &&
    existsSync(subtitlePath) &&
    existsSync(finalOutput)
  ) {
    const subtitledOutput = join(getTempDir(), `subtitled-${uuid()}.mp4`)
    let duration: number | undefined
    try {
      const info = await getVideoInfo(finalOutput)
      duration = info.duration
    } catch {
      /* ignore */
    }
    await burnSubtitles(
      finalOutput,
      subtitlePath,
      subtitledOutput,
      (p) => onProgress?.(85 + p * 0.12),
      duration,
    )
    if (finalOutput !== concatOutput) {
      try {
        unlinkSync(finalOutput)
      } catch {
        /* ignore */
      }
    }
    finalOutput = subtitledOutput
    outputFileName = outputName || `LocalCanvas_subtitled_${Date.now()}.mp4`
    outputPath = join(getOutputDir(), outputFileName)
  }

  renameSync(finalOutput, outputPath)

  onProgress?.(100)
  cleanupTemp()

  return outputPath
}
