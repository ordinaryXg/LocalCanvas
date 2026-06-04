import { spawn, exec } from 'child_process'
import { join, dirname } from 'path'
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  rmSync,
  statSync,
} from 'fs'
import { getFFmpegPath } from './ffmpeg'

let userDataPath = ''

export function initFfmpegService(dataPath: string): void {
  userDataPath = dataPath
}

function getTempDir(): string {
  return join(userDataPath, 'LocalCanvas', '.temp')
}

export interface VideoInfo {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
}

function runFFmpeg(
  args: string[],
  onProgress?: (percentage: number, time: number) => void,
  totalDuration?: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), args)
    let stderr = ''

    ffmpeg.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      stderr += text

      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
      if (timeMatch && onProgress) {
        const hours = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])
        const seconds = parseInt(timeMatch[3])
        const centiseconds = parseInt(timeMatch[4])
        const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
        const pct =
          totalDuration && totalDuration > 0
            ? Math.min(99, Math.round((totalSeconds / totalDuration) * 100))
            : 0
        onProgress(pct, totalSeconds)
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`))
    })

    ffmpeg.on('error', reject)
  })
}

export async function trimVideo(
  input: string,
  startTime: number,
  endTime: number,
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(dirname(output), { recursive: true })

  const duration = endTime - startTime
  const args = [
    '-y',
    '-i',
    input,
    '-ss',
    startTime.toString(),
    '-to',
    endTime.toString(),
    '-c',
    'copy',
    output,
  ]

  await runFFmpeg(
    args,
    (pct) => onProgress?.(pct),
    duration > 0 ? duration : undefined,
  )

  return output
}

export async function concatVideos(
  inputs: string[],
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(dirname(output), { recursive: true })
  mkdirSync(getTempDir(), { recursive: true })

  const listPath = join(getTempDir(), `concat-${Date.now()}.txt`)
  const listContent = inputs.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n')
  writeFileSync(listPath, listContent, 'utf-8')

  try {
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', output]
    await runFFmpeg(args, (pct) => onProgress?.(pct))
    return output
  } finally {
    if (existsSync(listPath)) unlinkSync(listPath)
  }
}

export async function concatVideosReencode(
  inputs: string[],
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(dirname(output), { recursive: true })
  mkdirSync(getTempDir(), { recursive: true })

  const listPath = join(getTempDir(), `concat-${Date.now()}.txt`)
  const listContent = inputs.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n')
  writeFileSync(listPath, listContent, 'utf-8')

  try {
    const args = [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-preset',
      'medium',
      '-crf',
      '23',
      output,
    ]
    await runFFmpeg(args, (pct) => onProgress?.(pct))
    return output
  } finally {
    if (existsSync(listPath)) unlinkSync(listPath)
  }
}

export async function mergeAudioVideo(
  videoPath: string,
  audioPath: string,
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(dirname(output), { recursive: true })

  const args = [
    '-y',
    '-i',
    videoPath,
    '-i',
    audioPath,
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-shortest',
    output,
  ]

  await runFFmpeg(args, (pct) => onProgress?.(pct))
  return output
}

export async function extractAudio(input: string, output: string): Promise<string> {
  mkdirSync(dirname(output), { recursive: true })

  const args = ['-y', '-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', output]
  await runFFmpeg(args)
  return output
}

export async function getVideoInfo(input: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    exec(`"${getFFmpegPath()}" -i "${input}" 2>&1`, (_error, _stdout, stderr) => {
      const output = stderr || ''

      const durationMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
      const resolutionMatch = output.match(/(\d{3,5})x(\d{3,5})/)
      const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/)
      const bitrateMatch = output.match(/bitrate:\s*(\d+)\s*kb\/s/)
      const codecMatch = output.match(/Video:\s*(\w+)/)

      if (!durationMatch) {
        reject(new Error('Cannot parse video info'))
        return
      }

      resolve({
        duration:
          parseInt(durationMatch[1]) * 3600 +
          parseInt(durationMatch[2]) * 60 +
          parseInt(durationMatch[3]) +
          parseInt(durationMatch[4]) / 100,
        width: resolutionMatch ? parseInt(resolutionMatch[1]) : 0,
        height: resolutionMatch ? parseInt(resolutionMatch[2]) : 0,
        fps: fpsMatch ? parseFloat(fpsMatch[1]) : 30,
        bitrate: bitrateMatch ? parseInt(bitrateMatch[1]) : 0,
        codec: codecMatch ? codecMatch[1] : 'unknown',
      })
    })
  })
}

export async function generateThumbnail(
  input: string,
  time = 0.5,
  output?: string,
): Promise<string> {
  const thumbDir = join(userDataPath, 'LocalCanvas', 'thumbnails')
  mkdirSync(thumbDir, { recursive: true })
  const outPath = output ?? join(thumbDir, `${Date.now()}.jpg`)

  const args = [
    '-y',
    '-i',
    input,
    '-ss',
    time.toString(),
    '-frames:v',
    '1',
    '-q:v',
    '2',
    '-s',
    '320x180',
    outPath,
  ]

  await runFFmpeg(args)
  return outPath
}

export function cleanupTemp(): void {
  const tempDir = getTempDir()
  if (!existsSync(tempDir)) return

  const files = readdirSync(tempDir)
  const now = Date.now()
  for (const file of files) {
    const filePath = join(tempDir, file)
    try {
      const stat = statSync(filePath)
      if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
        rmSync(filePath, { recursive: true, force: true })
      }
    } catch {
      /* ignore */
    }
  }
}
