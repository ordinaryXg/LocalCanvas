import { spawn } from 'child_process'
import { dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { getFFmpegPath } from './ffmpeg'

function escapeSubtitlesPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function runFFmpeg(
  args: string[],
  onProgress?: (percentage: number) => void,
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
        onProgress(pct)
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg subtitle burn failed: ${stderr.slice(-500)}`))
    })
    ffmpeg.on('error', reject)
  })
}

export async function burnSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  onProgress?: (percentage: number) => void,
  videoDuration?: number,
): Promise<string> {
  if (!existsSync(videoPath)) throw new Error('Video file not found')
  if (!existsSync(srtPath)) throw new Error('Subtitle file not found')

  mkdirSync(dirname(outputPath), { recursive: true })

  const escaped = escapeSubtitlesPath(srtPath)
  const vf = `subtitles='${escaped}':force_style='FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2'`

  await runFFmpeg(
    ['-y', '-i', videoPath, '-vf', vf, '-c:a', 'copy', outputPath],
    onProgress,
    videoDuration,
  )

  return outputPath
}
