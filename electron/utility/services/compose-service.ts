import { join } from 'path'
import { mkdirSync, existsSync, unlinkSync, renameSync } from 'fs'
import { v4 as uuid } from 'uuid'
import {
  concatVideos,
  concatVideosReencode,
  mergeAudioVideo,
  cleanupTemp,
} from './ffmpeg-service'
import { validateConcatCompatibility } from './ffmpeg'

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

  const { clips, audioPath, outputName } = options
  let { reencode = false } = options

  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)
  const videoPaths = sortedClips.map((c) => c.path)

  if (videoPaths.length === 0) {
    throw new Error('No video clips to compose')
  }

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

  const outputFileName = outputName || `LocalCanvas_${Date.now()}.mp4`
  const outputPath = join(getOutputDir(), outputFileName)
  renameSync(finalOutput, outputPath)

  onProgress?.(100)
  cleanupTemp()

  return outputPath
}
