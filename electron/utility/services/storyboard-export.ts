import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { getFFmpegPath } from './ffmpeg'

const CELL_W = 400
const CELL_H = 300
const IMG_H = 220

export interface StoryboardExportFrame {
  sequence: number
  description: string
  imagePath?: string
}

export type StoryboardExportLayout = 'list' | 'grid3' | 'grid5'

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), args)
    let stderr = ''
    ffmpeg.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`))
    })
    ffmpeg.on('error', reject)
  })
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .slice(0, 72)
}

function colsForLayout(layout: StoryboardExportLayout, count: number): number {
  if (layout === 'grid5') return Math.min(5, Math.max(1, count))
  if (layout === 'grid3') return Math.min(3, Math.max(1, count))
  return 1
}

function getTempDir(userDataPath: string): string {
  return join(userDataPath, 'LocalCanvas', '.temp')
}

function getOutputDir(userDataPath: string): string {
  return join(userDataPath, 'LocalCanvas', 'outputs')
}

async function renderCell(
  frame: StoryboardExportFrame,
  outPath: string,
): Promise<void> {
  const label = escapeDrawtext(`#${frame.sequence} ${frame.description || ''}`)
  const vf = frame.imagePath && existsSync(frame.imagePath)
    ? `scale=${CELL_W}:${IMG_H}:force_original_aspect_ratio=decrease,pad=${CELL_W}:${IMG_H}:(ow-iw)/2:(oh-ih)/2:color=#1e1e2e,pad=${CELL_W}:${CELL_H}:0:0:color=#1e1e2e,drawtext=text='${label}':fontsize=13:fontcolor=white:x=12:y=${IMG_H + 24}:w=${CELL_W - 24}`
    : `drawtext=text='${label}':fontsize=16:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`

  const args = frame.imagePath && existsSync(frame.imagePath)
    ? ['-y', '-i', frame.imagePath, '-vf', vf, '-frames:v', '1', outPath]
    : [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `color=c=#2d2d44:s=${CELL_W}x${CELL_H}:d=1`,
        '-vf',
        vf,
        '-frames:v',
        '1',
        outPath,
      ]

  await runFFmpeg(args)
}

async function tileCells(cellPaths: string[], cols: number, outputPath: string): Promise<void> {
  const n = cellPaths.length
  const rows = Math.ceil(n / cols)
  const layoutParts: string[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (idx >= n) break
      const x = c * CELL_W
      const y = r * CELL_H
      layoutParts.push(`${x}_${y}`)
    }
  }

  const scaleFilters = cellPaths.map((_, i) => `[${i}:v]scale=${CELL_W}:${CELL_H}[v${i}]`).join(';')
  const stackInputs = cellPaths.map((_, i) => `[v${i}]`).join('')
  const filter = `${scaleFilters};${stackInputs}xstack=inputs=${n}:layout=${layoutParts.join('|')}[out]`

  const args = [
    ...cellPaths.flatMap((p) => ['-i', p]),
    '-filter_complex',
    filter,
    '-map',
    '[out]',
    '-frames:v',
    '1',
    '-y',
    outputPath,
  ]

  await runFFmpeg(args)
}

export async function exportStoryboardPng(
  userDataPath: string,
  frames: StoryboardExportFrame[],
  layout: StoryboardExportLayout,
  baseName = 'storyboard',
): Promise<string> {
  if (frames.length === 0) throw new Error('No frames to export')

  const tempDir = join(getTempDir(userDataPath), `sb-${uuid()}`)
  const outputDir = getOutputDir(userDataPath)
  mkdirSync(tempDir, { recursive: true })
  mkdirSync(outputDir, { recursive: true })

  const cellPaths: string[] = []
  try {
    for (let i = 0; i < frames.length; i++) {
      const cellPath = join(tempDir, `cell-${i}.png`)
      await renderCell(frames[i], cellPath)
      cellPaths.push(cellPath)
    }

    const cols = colsForLayout(layout, frames.length)
    const pngPath = join(outputDir, `${baseName}.png`)
    await tileCells(cellPaths, cols, pngPath)
    return pngPath
  } finally {
    for (const p of cellPaths) {
      try {
        unlinkSync(p)
      } catch {
        /* ignore */
      }
    }
  }
}

export async function exportStoryboardPdf(
  userDataPath: string,
  frames: StoryboardExportFrame[],
  layout: StoryboardExportLayout,
  baseName = 'storyboard',
): Promise<string> {
  const pngPath = await exportStoryboardPng(userDataPath, frames, layout, `${baseName}-tmp`)
  const pdfPath = join(getOutputDir(userDataPath), `${baseName}.pdf`)

  try {
    await runFFmpeg(['-y', '-i', pngPath, pdfPath])
    return pdfPath
  } finally {
    try {
      unlinkSync(pngPath)
    } catch {
      /* ignore */
    }
  }
}

export async function exportFrame4k(
  userDataPath: string,
  imagePath: string,
  sequence: number,
): Promise<string> {
  if (!existsSync(imagePath)) throw new Error('Frame image not found')

  const outputDir = getOutputDir(userDataPath)
  mkdirSync(outputDir, { recursive: true })
  const outPath = join(outputDir, `frame-${sequence}-4k.png`)

  await runFFmpeg([
    '-y',
    '-i',
    imagePath,
    '-vf',
    'scale=3840:-2:flags=lanczos',
    outPath,
  ])

  return outPath
}
