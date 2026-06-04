import { createWriteStream, existsSync, mkdirSync, readdirSync, copyFileSync, chmodSync, rmSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)

type Platform = 'win32' | 'darwin' | 'linux'

const FFMPEG_DOWNLOAD: Record<
  Platform,
  { url: string; archiveName: string; binaryName: string; extract: 'zip' | 'tar.xz' }
> = {
  win32: {
    url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    archiveName: 'ffmpeg-download.zip',
    binaryName: 'ffmpeg.exe',
    extract: 'zip',
  },
  darwin: {
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    archiveName: 'ffmpeg-download.zip',
    binaryName: 'ffmpeg',
    extract: 'zip',
  },
  linux: {
    url: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    archiveName: 'ffmpeg-download.tar.xz',
    binaryName: 'ffmpeg',
    extract: 'tar.xz',
  },
}

function findBinaryRecursive(dir: string, binaryName: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findBinaryRecursive(full, binaryName)
      if (found) return found
    } else if (entry.name === binaryName) {
      return full
    }
  }
  return null
}

async function extractArchive(
  archivePath: string,
  extractDir: string,
  kind: 'zip' | 'tar.xz',
): Promise<void> {
  mkdirSync(extractDir, { recursive: true })
  if (kind === 'zip') {
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`
      await execAsync(cmd)
      return
    }
    await execAsync(`unzip -o "${archivePath}" -d "${extractDir}"`)
    return
  }
  await execAsync(`tar -xf "${archivePath}" -C "${extractDir}"`)
}

export async function downloadAndInstallFfmpeg(
  binDir: string,
  targetPath: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  const platform = process.platform as Platform
  const info = FFMPEG_DOWNLOAD[platform]
  if (!info) {
    throw new Error(`Unsupported platform for FFmpeg download: ${platform}`)
  }

  mkdirSync(binDir, { recursive: true })
  const workDir = join(binDir, '.download-tmp')
  const archivePath = join(workDir, info.archiveName)
  const extractDir = join(workDir, 'extracted')

  if (existsSync(workDir)) {
    rmSync(workDir, { recursive: true, force: true })
  }
  mkdirSync(workDir, { recursive: true })

  try {
    onProgress?.(0)
    const res = await axios.get(info.url, {
      responseType: 'stream',
      timeout: 300_000,
      maxRedirects: 5,
    })
    const totalLength = parseInt(res.headers['content-length'] || '0', 10)
    let downloaded = 0

    await new Promise<void>((resolve, reject) => {
      const writer = createWriteStream(archivePath)
      res.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (totalLength > 0) {
          onProgress?.(Math.min(50, Math.round((downloaded / totalLength) * 50)))
        }
      })
      res.data.pipe(writer)
      writer.on('finish', () => resolve())
      writer.on('error', reject)
      res.data.on('error', reject)
    })

    onProgress?.(55)
    await extractArchive(archivePath, extractDir, info.extract)
    onProgress?.(75)

    const binary = findBinaryRecursive(extractDir, info.binaryName)
    if (!binary) {
      throw new Error(`Could not find ${info.binaryName} in downloaded archive`)
    }

    copyFileSync(binary, targetPath)
    if (process.platform !== 'win32') {
      chmodSync(targetPath, 0o755)
    }

    onProgress?.(95)
    await execAsync(`"${targetPath}" -version`)
    onProgress?.(100)
    return targetPath
  } finally {
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true })
    }
  }
}
