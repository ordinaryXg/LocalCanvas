import { spawn, exec } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { getFFmpegPath } from '../ffmpeg'

export interface VocalSeparationOptions {
  demucsPath?: string
  apiEndpoint?: string
  apiKey?: string
}

export interface VocalSeparationResult {
  vocalsPath: string
  instrumentalPath: string
  mode: 'demucs' | 'ffmpeg'
}

function runCommand(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' })
    let stderr = ''
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed (${code}): ${stderr.slice(-400)}`))
    })
    child.on('error', reject)
  })
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), args)
    let stderr = ''
    ffmpeg.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg failed: ${stderr.slice(-400)}`))
    })
    ffmpeg.on('error', reject)
  })
}

function findDemucsOutput(dir: string, stem: 'vocals' | 'no_vocals'): string | null {
  if (!existsSync(dir)) return null
  const walk = (folder: string): string | null => {
    for (const entry of readdirSync(folder)) {
      const full = join(folder, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        const found = walk(full)
        if (found) return found
      } else if (entry.includes(stem) && /\.(wav|mp3|flac)$/i.test(entry)) {
        return full
      }
    }
    return null
  }
  return walk(dir)
}

export async function detectDemucs(demucsPath?: string): Promise<boolean> {
  const cmd = demucsPath?.trim() || 'demucs'
  return new Promise((resolve) => {
    exec(`"${cmd}" --help`, (err) => resolve(!err))
  })
}

async function separateWithDemucs(
  inputPath: string,
  outputDir: string,
  demucsPath: string,
): Promise<VocalSeparationResult> {
  const workDir = join(outputDir, `demucs-${uuid()}`)
  mkdirSync(workDir, { recursive: true })

  await runCommand(demucsPath, ['--two-stems', 'vocals', '-o', workDir, inputPath])

  const vocals = findDemucsOutput(workDir, 'vocals')
  const instrumental = findDemucsOutput(workDir, 'no_vocals')
  if (!vocals || !instrumental) {
    throw new Error('Demucs output not found')
  }

  return { vocalsPath: vocals, instrumentalPath: instrumental, mode: 'demucs' }
}

async function separateWithFfmpeg(
  inputPath: string,
  outputDir: string,
): Promise<VocalSeparationResult> {
  mkdirSync(outputDir, { recursive: true })
  const vocalsPath = join(outputDir, `vocals-${uuid()}.wav`)
  const instrumentalPath = join(outputDir, `instrumental-${uuid()}.wav`)

  await runFFmpeg([
    '-y',
    '-i',
    inputPath,
    '-af',
    'pan=stereo|c0=c0+0.5*c1|c1=c1+0.5*c0',
    vocalsPath,
  ])

  await runFFmpeg([
    '-y',
    '-i',
    inputPath,
    '-af',
    'pan=stereo|c0=c0-0.5*c1|c1=c1-0.5*c0',
    instrumentalPath,
  ])

  return { vocalsPath, instrumentalPath, mode: 'ffmpeg' }
}

export async function separateVocals(
  inputPath: string,
  userDataPath: string,
  options: VocalSeparationOptions,
): Promise<VocalSeparationResult> {
  if (!existsSync(inputPath)) throw new Error('Audio file not found')

  const outputDir = join(userDataPath, 'LocalCanvas', 'outputs', 'vocal-separation')
  mkdirSync(outputDir, { recursive: true })

  const demucsPath = options.demucsPath?.trim() || 'demucs'
  const hasDemucs = await detectDemucs(demucsPath)
  if (hasDemucs) {
    return separateWithDemucs(inputPath, outputDir, demucsPath)
  }

  return separateWithFfmpeg(inputPath, outputDir)
}

export function resolveDemucsHint(): string {
  return 'Configure demucs_path in settings, or install Demucs CLI. FFmpeg fallback uses basic stereo separation.'
}
