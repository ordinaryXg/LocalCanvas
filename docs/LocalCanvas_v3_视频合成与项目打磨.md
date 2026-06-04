# LocalCanvas v3 — 视频合成 + 项目打磨

> **版本目标**：集成 FFmpeg 实现视频剪辑与合成，完善项目管理和资产系统，打磨用户体验  
> **预计周期**：2.5 周（12 个工作日）  
> **前置条件**：v2 验收通过  
> **生成日期**：2026-06-04  
> **最后更新**：2026-06-04（v3 全量完成 + 验收状态同步）

---

## 零、实现状态总览

**整体完成度：100%** — 核心「创作 → 剪辑 → 合成 → 导出」链路已可用；性能优化与 E2E 已落地。

| 类别 | 状态 | 说明 |
|------|------|------|
| FFmpeg 检测与配置 | ✅ 已完成 | `detectFFmpeg` + 设置页路径 + 主进程 `ensureFFmpeg` 对话框引导 |
| FFmpeg 自动下载 | ✅ 已完成 | `downloadFFmpeg()` + 设置页「下载安装」+ ensure 对话框「自动下载」 |
| FFmpeg 路径持久化 | ✅ 已完成 | ensure / 下载成功后自动写入 `settings.ffmpeg_path` |
| 视频裁切 / 合成 / 混流 | ✅ 已完成 | Utility Process 执行，`validateConcatCompatibility` 自动降级重编码 |
| 时间轴 + 合成导出 | ✅ 已完成 | `TimelinePanel` 底部浮层，合成后自动创建视频节点 |
| 播放指针 + 预览 | ✅ 已完成 | `TimelinePreview` 按指针 seek 当前片段 |
| 项目管理 | ✅ 已完成 | 拖拽排序、右键菜单、缩略图、创建/更新时间 |
| 资产面板 | ✅ 已完成 | 浏览/导入/拖拽；视频项显示 FFmpeg 首帧缩略图 |
| 主题 | ✅ 已完成 | `themeStore` + `theme-light.css`，CSS Variables 令牌化 |
| 单元测试 | ✅ 已完成 | 41 项 vitest（含 `timelineVisibleClips`、`composeClips`、`timelineClipAtTime`） |
| 性能 / E2E | ✅ 已完成 | 画布 `onlyRenderVisibleElements`；时间轴可见区间 culling；Playwright E2E |

**关键代码入口**（便于对照源码）：

| 模块 | 路径 |
|------|------|
| FFmpeg 引导 | `electron/main/services/ffmpeg-setup.ts`、`ffmpeg-config.ts` |
| FFmpeg 下载 | `electron/utility/services/ffmpeg-download.ts` |
| FFmpeg 服务 | `electron/utility/services/ffmpeg.ts`、`ffmpeg-service.ts` |
| 合成服务 | `electron/utility/services/compose-service.ts` |
| 缩略图缓存 | `electron/main/services/thumbnail.ts` |
| 项目排序/缩略图 | `electron/main/services/project.ts`（`list_order`、`refreshProjectThumbnail`） |
| 时间轴 | `src/components/timeline/Timeline.tsx`、`TimelinePreview.tsx` |
| 时间轴可见区 culling | `src/utils/timelineVisibleClips.ts` |
| E2E | `e2e/app.spec.ts`、`e2e/compose-smoke.spec.ts` |
| 时间轴面板 | `src/components/panels/TimelinePanel.tsx` |
| 合成 Hook | `src/hooks/useCompose.ts` |
| 项目列表 | `src/components/project/StartPage.tsx`、`ProjectCard.tsx` |
| 资产面板 | `src/components/sidebar/AssetPanel.tsx` |

---

## 一、版本功能清单

| # | 功能模块 | 子功能 | 优先级 | 依赖 | 状态 |
|---|----------|--------|--------|------|------|
| 1 | FFmpeg | 检测/下载/路径配置 | P0 | — | ✅ |
| 2 | FFmpeg | 服务封装（裁取/拼接/混流/提取） | P0 | #1 | ✅ |
| 3 | FFmpeg | 进度回调 | P0 | #2 | ✅ |
| 4 | 视频剪辑 | 视频预览播放器 | P0 | #1 | ✅ |
| 5 | 视频剪辑 | 入点/出点裁取 | P0 | #2 | ✅ |
| 6 | 合成节点 | 合成节点类型 | P0 | v1 节点系统 | ✅ |
| 7 | 合成节点 | 多视频+音频输入端口 | P0 | #6 | ✅ |
| 8 | 时间轴 | 时间轴编辑器 UI | P0 | #7 | ✅ |
| 9 | 时间轴 | 视频轨道拖拽排序 | P0 | #8 | ✅ |
| 10 | 时间轴 | 音频轨道 | P1 | #9 | ✅ |
| 11 | 时间轴 | 播放指针+预览 | P1 | #8 | ✅ |
| 12 | 合成导出 | FFmpeg 拼接合成 | P0 | #2, #8 | ✅ |
| 13 | 合成导出 | MP4 导出 | P0 | #12 | ✅ |
| 14 | 合成导出 | 音频混流 | P1 | #10, #12 | ✅ |
| 15 | 项目管理 | 项目列表页完善 | P1 | v1 项目存取 | ✅ |
| 16 | 项目管理 | 项目缩略图 | P2 | #15 | ✅ |
| 17 | 资产面板 | 资产浏览+拖拽使用 | P1 | v1 侧栏 | ✅ |
| 18 | 资产面板 | 外部文件导入 | P1 | #17 | ✅ |
| 19 | 深色主题 | 主题系统统一完善 | P1 | v1 基础主题 | ✅ |
| 20 | 主题 | 白天模式 | P2 | #19 | ✅ |
| 21 | 性能 | 大节点数优化（viewport culling） | P2 | v1 画布 | ✅ `onlyRenderVisibleElements` |
| 22 | 性能 | 缩略图缓存 | P2 | #17 | ✅ |

---

## 二、技术架构（v3 新增）

> **⚠️ 关键修正**：FFmpeg spawn 是 CPU 密集操作，合成服务涉及大文件 I/O，不可在主进程执行。统一移入 Utility Process。

```
┌─────────────────────────────────────────────────────────────────┐
│ Main Process（v3 仅做 IPC 路由 + 数据库操作）                      │
│                                                                  │
│ ├── IPC 转发层（Renderer ↔ Utility）                              │
│ │   ├── ffmpeg:ensure → 主进程对话框引导（裁切/合成前）           │
│ │   ├── ffmpeg:detect / ffmpeg:trim → Utility Process           │
│ │   ├── ffmpeg:concat → Utility Process                          │
│ │   ├── ffmpeg:mergeAudio → Utility Process                      │
│ │   ├── compose:start → Utility Process                          │
│ │   ├── compose:progress ← Utility Process → Renderer           │
│ │   ├── compose:cancel → Utility Process                        │
│ │   ├── project:reorder / project:readThumbnail                 │
│ │   └── asset:import / asset:list / asset:thumbnail             │
│ │                                                                │
│ ├── 资产服务                                                     │
│ │   ├── importAsset(projectId, filePath, type) → string        │
│ │   ├── listAssets(projectId) → Asset[]                         │
│ │   └── generateThumbnail(filePath) → string                    │
│ │                                                                │
│ └── SQLite 数据库（项目/资产元数据）                              │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Utility Process（CPU/IO 密集操作，v3 新增 FFmpeg 子系统）     ││
│ │ │                                                             ││
│ │ ├── FFmpeg 服务（spawn 子进程）                                ││
│ │ │   ├── detectFFmpeg() → string | null                        ││
│ │ │   ├── downloadFFmpeg() → string                              ││
│ │ │   ├── validateConcatCompatibility(paths[]) → Result        ││
│ │ │   ├── trimVideo(input, start, end, output) → Promise<void> ││
│ │ │   ├── concatVideos(inputs[], output) → Promise<void>        ││
│ │ │   ├── concatVideosReencode(inputs[], output) → Promise<>    ││
│ │ │   ├── mergeAudioVideo(video, audio, output) → Promise<void>││
│ │ │   ├── extractAudio(input, output) → Promise<string>         ││
│ │ │   ├── getVideoInfo(input) → VideoInfo                       ││
│ │ │   └── 进度推送: MessagePort → Main → Renderer               ││
│ │ │                                                             ││
│ │ ├── 合成服务                                                   ││
│ │ │   ├── composeClips(clips[], options) → Promise<string>      ││
│ │ │   ├── 编码一致性检测（concat 前自动校验）                    ││
│ │ │   └── 临时文件自动清理                                        ││
│ │ │                                                             ││
│ │ └── 日志 (electron-log)                                       ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Renderer Process (v3 新增)                                     ││
│ │ ├── <ComposeNode> 合成节点组件                                 ││
│ │ ├── <VideoPreview> 视频预览窗口                                ││
│ │ ├── <VideoTrimmer> 视频裁取工具                               ││
│ │ ├── <TimelinePanel> 画布底部可收起时间轴浮层                   ││
│ │ ├── <Timeline> 时间轴编辑器                                    ││
│ │ │   ├── 视频轨道 (VideoTrack)                                  ││
│ │ │   ├── 音频轨道 (AudioTrack)                                  ││
│ │ │   ├── 时间标尺 (TimeRuler)                                  ││
│ │ │   ├── 播放指针 (Playhead) + onPlayheadChange                ││
│ │ │   └── <TimelinePreview> 指针联动视频预览                     ││
│ │ ├── <StartPage> / <ProjectCard> 项目列表（拖拽排序+缩略图）    ││
│ │ ├── <AssetPanel> 资产面板 (完善，含视频缩略图)                 ││
│ │ └── 主题切换 (深色/浅色，CSS Variables)                        ││
│ └───────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、详细开发步骤

### Day 1-2：FFmpeg 集成

#### Step 3.1.1 FFmpeg 检测与下载

**文件**：`electron/utility/services/ffmpeg.ts`（⚠️ 修订：从 main 移入 Utility Process）

```typescript
import { exec, spawn } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)

// ⚠️ 修订：跨平台路径支持（原版只有 win32/darwin，缺 linux）
const FFMPEG_DIR = join(app.getPath('userData'), 'LocalCanvas', 'bin')
const FFMPEG_PATHS: Record<string, string> = {
  win32: join(FFMPEG_DIR, 'ffmpeg.exe'),
  darwin: join(FFMPEG_DIR, 'ffmpeg'),
  linux: join(FFMPEG_DIR, 'ffmpeg'),
}

// ⚠️ 修订：下载 URL 需要版本锁定 + 校验，避免过期 URL 导致下载失败
const FFMPEG_DOWNLOAD_URLS: Record<string, { url: string; type: 'zip' | '7z' }> = {
  win32: { url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip', type: 'zip' },
  darwin: { url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip', type: 'zip' },
  linux: { url: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz', type: '7z' },
}

let ffmpegPath: string | null = null

/**
 * 检测本地 FFmpeg
 * 优先级：用户配置路径 > 系统PATH > 内置下载
 *
 * ⚠️ 修订：增加 Linux 支持，增加校验步骤
 */
export async function detectFFmpeg(userPath?: string): Promise<string> {
  // 1. 用户配置（最高优先级）
  if (userPath && existsSync(userPath)) {
    // 验证是否可执行
    try {
      await execAsync(`"${userPath}" -version`)
      ffmpegPath = userPath
      return ffmpegPath
    } catch {
      throw new Error(`Configured FFmpeg path is invalid: ${userPath}`)
    }
  }

  // 2. 内置下载路径
  const builtinPath = FFMPEG_PATHS[process.platform]
  if (builtinPath && existsSync(builtinPath)) {
    ffmpegPath = builtinPath
    return ffmpegPath
  }

  // 3. 系统 PATH（原版缺少 where/which 区分）
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg'
    const { stdout } = await execAsync(cmd)
    const systemPath = stdout.trim().split('\n')[0].trim()
    if (systemPath && existsSync(systemPath)) {
      ffmpegPath = systemPath
      return ffmpegPath
    }
  } catch { /* 不在 PATH 中 */ }

  // 4. 尝试直接调用（兜底）
  try {
    const { stdout } = await execAsync('ffmpeg -version')
    if (stdout.includes('ffmpeg version')) {
      ffmpegPath = 'ffmpeg'
      return ffmpegPath
    }
  } catch { /* 不可用 */ }

  throw new Error('FFmpeg not found. Please install FFmpeg or configure its path in settings.')
}

/**
 * 下载 FFmpeg（首次使用时调用）
 *
 * ⚠️ 修订：增加解压逻辑 + 文件权限设置 + 下载 URL 过期处理
 */
export async function downloadFFmpeg(
  onProgress?: (percentage: number) => void
): Promise<string> {
  const platform = process.platform as 'win32' | 'darwin' | 'linux'
  const downloadInfo = FFMPEG_DOWNLOAD_URLS[platform]
  if (!downloadInfo) throw new Error(`Unsupported platform: ${platform}`)

  mkdirSync(FFMPEG_DIR, { recursive: true })
  const targetPath = FFMPEG_PATHS[platform]
  if (!targetPath) throw new Error(`No target path for platform: ${platform}`)

  try {
    const res = await axios.get(downloadInfo.url, {
      responseType: 'stream',
      timeout: 60000,  // ⚠️ 修订：增加超时防止无限等待
    })
    const totalLength = parseInt(res.headers['content-length'] || '0')
    let downloaded = 0

    await new Promise<void>((resolve, reject) => {
      // ⚠️ 修订：下载到临时文件，完成后解压再移动
      const tempArchive = join(FFMPEG_DIR, `ffmpeg-download.${downloadInfo.type === 'zip' ? 'zip' : 'tar.xz'}`)
      const writer = createWriteStream(tempArchive)
      res.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (totalLength > 0) {
          onProgress?.(Math.round((downloaded / totalLength) * 50))  // 下载占 50%
        }
      })
      res.data.pipe(writer)
      writer.on('finish', () => {
        onProgress?.(55)
        // 解压逻辑（简化：假设 zip 包中直接有 ffmpeg 二进制）
        // 实际实现需根据平台做解压 + 查找二进制 + 设置可执行权限
        // 这里用 @ffmpeg-installer/ffmpeg 作为降级方案
        resolve()
      })
      writer.on('error', reject)
    })

    ffmpegPath = targetPath
    return targetPath
  } catch (err: any) {
    // ⚠️ 修订：下载失败时给出明确提示，而非静默失败
    throw new Error(
      `FFmpeg download failed: ${err.message}. ` +
      `Please download manually from https://ffmpeg.org/download.html and configure the path in settings.`
    )
  }
}

export function getFFmpegPath(): string {
  if (!ffmpegPath) throw new Error('FFmpeg not initialized. Call detectFFmpeg() first.')
  return ffmpegPath
}

/**
 * ⚠️ 新增：视频编码一致性检测
 * concat demuxer 要求所有片段编码参数一致，否则拼接失败/黑屏/花屏
 */
export async function validateConcatCompatibility(videoPaths: string[]): Promise<{
  compatible: boolean
  issues: string[]
}> {
  const issues: string[] = []
  const infoList: VideoCodecInfo[] = []

  for (const path of videoPaths) {
    try {
      const info = await getVideoInfo(path)
      infoList.push(info)
    } catch (err) {
      issues.push(`Cannot read video: ${path} - ${err}`)
    }
  }

  if (infoList.length < 2) return { compatible: true, issues: [] }

  // 检查编码、分辨率、帧率是否一致
  const first = infoList[0]
  for (let i = 1; i < infoList.length; i++) {
    const curr = infoList[i]
    if (curr.codec !== first.codec) {
      issues.push(`Codec mismatch: clip 1 is ${first.codec}, clip ${i + 1} is ${curr.codec}`)
    }
    if (curr.width !== first.width || curr.height !== first.height) {
      issues.push(`Resolution mismatch: clip 1 is ${first.width}x${first.height}, clip ${i + 1} is ${curr.width}x${curr.height}`)
    }
    if (Math.abs(curr.fps - first.fps) > 0.5) {
      issues.push(`FPS mismatch: clip 1 is ${first.fps}, clip ${i + 1} is ${curr.fps}`)
    }
  }

  return { compatible: issues.length === 0, issues }
}

interface VideoCodecInfo {
  codec: string
  width: number
  height: number
  fps: number
  duration: number
}
```

---

#### Step 3.1.2 FFmpeg 服务封装

**文件**：`electron/utility/services/ffmpeg-service.ts`（⚠️ 修订：从 main 移入 Utility Process）

```typescript
import { spawn, exec } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readdirSync, rmSync } from 'fs'
import { getFFmpegPath } from './ffmpeg'
import { app } from 'electron'
import { BrowserWindow } from 'electron'

const TEMP_DIR = join(app.getPath('userData'), 'LocalCanvas', '.temp')

export interface VideoInfo {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
}

/**
 * 执行 FFmpeg 命令，支持进度回调
 */
function runFFmpeg(
  args: string[],
  onProgress?: (percentage: number, time: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), args)
    let stderr = ''

    ffmpeg.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      stderr += text

      // 解析进度: time=00:00:05.23
      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
      if (timeMatch && onProgress) {
        const hours = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])
        const seconds = parseInt(timeMatch[3])
        const totalSeconds = hours * 3600 + minutes * 60 + seconds
        onProgress(0, totalSeconds) // percentage 需要 totalDuration 来计算
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`))
    })

    ffmpeg.on('error', reject)
  })
}

/**
 * 裁取视频片段
 */
export async function trimVideo(
  input: string,
  startTime: number,
  endTime: number,
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(join(output, '..'), { recursive: true })

  const args = [
    '-y',
    '-i', input,
    '-ss', startTime.toString(),
    '-to', endTime.toString(),
    '-c', 'copy',       // 无损裁取（若精确裁取需重编码）
    output,
  ]

  await runFFmpeg(args, (_, time) => {
    const duration = endTime - startTime
    if (duration > 0) onProgress?.(Math.round((time / duration) * 100))
  })

  return output
}

/**
 * 拼接多个视频
 */
export async function concatVideos(
  inputs: string[],
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(join(output, '..'), { recursive: true })

  // 生成 concat 文件列表
  const listPath = join(TEMP_DIR, `concat-${Date.now()}.txt`)
  const listContent = inputs.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n')
  writeFileSync(listPath, listContent, 'utf-8')

  try {
    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      output,
    ]

    await runFFmpeg(args, (_, time) => {
      // 简化进度：基于已处理文件数
      onProgress?.(Math.min(99, time * 10))
    })

    return output
  } finally {
    if (existsSync(listPath)) unlinkSync(listPath)
  }
}

/**
 * 拼接多个视频（重编码模式，兼容不同格式）
 */
export async function concatVideosReencode(
  inputs: string[],
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(join(output, '..'), { recursive: true })

  const listPath = join(TEMP_DIR, `concat-${Date.now()}.txt`)
  const listContent = inputs.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n')
  writeFileSync(listPath, listContent, 'utf-8')

  try {
    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'medium',
      '-crf', '23',
      output,
    ]

    await runFFmpeg(args, (_, time) => {
      onProgress?.(Math.min(99, time * 5))
    })

    return output
  } finally {
    if (existsSync(listPath)) unlinkSync(listPath)
  }
}

/**
 * 音频视频混流
 */
export async function mergeAudioVideo(
  videoPath: string,
  audioPath: string,
  output: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(join(output, '..'), { recursive: true })

  const args = [
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    output,
  ]

  await runFFmpeg(args)
  return output
}

/**
 * 提取音频
 */
export async function extractAudio(input: string, output: string): Promise<string> {
  mkdirSync(join(output, '..'), { recursive: true })

  const args = [
    '-y',
    '-i', input,
    '-vn',
    '-c:a', 'libmp3lame',
    '-q:a', '2',
    output,
  ]

  await runFFmpeg(args)
  return output
}

/**
 * 分离音视频轨道
 */
export async function splitTracks(
  input: string,
  videoOutput: string,
  audioOutput: string,
): Promise<{ videoPath: string; audioPath: string }> {
  // 提取纯视频
  await runFFmpeg(['-y', '-i', input, '-an', '-c:v', 'copy', videoOutput])
  // 提取纯音频
  await runFFmpeg(['-y', '-i', input, '-vn', '-c:a', 'aac', audioOutput])

  return { videoPath: videoOutput, audioPath: audioOutput }
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(input: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    exec(`"${getFFmpegPath()}" -i "${input}" 2>&1`, (error, _stdout, stderr) => {
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
        duration: parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3]) + parseInt(durationMatch[4]) / 100,
        width: resolutionMatch ? parseInt(resolutionMatch[1]) : 0,
        height: resolutionMatch ? parseInt(resolutionMatch[2]) : 0,
        fps: fpsMatch ? parseFloat(fpsMatch[1]) : 30,
        bitrate: bitrateMatch ? parseInt(bitrateMatch[1]) : 0,
        codec: codecMatch ? codecMatch[1] : 'unknown',
      })
    })
  })
}

/**
 * 生成视频缩略图（首帧截图）
 */
export async function generateThumbnail(
  input: string,
  time: number = 0.5,
  output?: string,
): Promise<string> {
  if (!output) {
    mkdirSync(join(app.getPath('userData'), 'LocalCanvas', 'thumbnails'), { recursive: true })
    output = join(app.getPath('userData'), 'LocalCanvas', 'thumbnails', `${Date.now()}.jpg`)
  }

  const args = [
    '-y',
    '-i', input,
    '-ss', time.toString(),
    '-frames:v', '1',
    '-q:v', '2',
    '-s', '320x180',
    output,
  ]

  await runFFmpeg(args)
  return output
}

/**
 * 清理临时文件
 */
export function cleanupTemp(): void {
  if (existsSync(TEMP_DIR)) {
    const files = readdirSync(TEMP_DIR)
    const now = Date.now()
    for (const file of files) {
      const filePath = join(TEMP_DIR, file)
      try {
        const stat = require('fs').statSync(filePath)
        // 删除超过 24 小时的临时文件
        if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
          rmSync(filePath, { recursive: true, force: true })
        }
      } catch { /* 忽略 */ }
    }
  }
}
```

**验收**：所有 FFmpeg 操作可正常执行，进度回调正常

---

### Day 3-4：视频剪辑

#### Step 3.2.1 视频预览播放器

**文件**：`src/components/common/VideoPreview.tsx`

```tsx
import { useRef, useState, useEffect } from 'react'

interface Props {
  src: string
  onClose: () => void
  onTrim?: (start: number, end: number) => void
}

export function VideoPreview({ src, onClose, onTrim }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [inPoint, setInPoint] = useState(0)
  const [outPoint, setOutPoint] = useState(0)
  const [showTrimmer, setShowTrimmer] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setOutPoint(video.duration)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [src])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    const ms = Math.floor((s % 1) * 10)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
  }

  const frameStep = (direction: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + direction / 30))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[800px] bg-[#16213e] rounded-xl overflow-hidden">
        {/* 视频区域 */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full text-white hover:bg-black/80 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* 进度条 */}
        <div className="px-4 py-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value)
              if (videoRef.current) videoRef.current.currentTime = t
              setCurrentTime(t)
            }}
            className="w-full accent-[#6366f1]"
          />
        </div>

        {/* 控制栏 */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => frameStep(-1)} className="text-white text-sm">⏮</button>
            <button onClick={togglePlay} className="w-10 h-10 bg-[#6366f1] rounded-full text-white flex items-center justify-center hover:bg-[#5254d4]">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => frameStep(1)} className="text-white text-sm">⏭</button>
            <span className="text-xs text-gray-400 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!showTrimmer && onTrim && (
              <button onClick={() => setShowTrimmer(true)}
                className="text-xs px-3 py-1 bg-[#0f3460] text-gray-300 rounded hover:bg-[#16213e]">
                ✂️ 裁取
              </button>
            )}
          </div>
        </div>

        {/* 裁取工具 */}
        {showTrimmer && (
          <div className="px-4 py-3 border-t border-[#0f3460] bg-[#0f3460]/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-xs text-gray-400">
                入点: <button onClick={() => setInPoint(currentTime)} className="text-[#6366f1]">
                  I {formatTime(inPoint)}
                </button>
              </div>
              <div className="text-xs text-gray-400">
                出点: <button onClick={() => setOutPoint(currentTime)} className="text-[#6366f1]">
                  O {formatTime(outPoint)}
                </button>
              </div>
              <span className="text-xs text-gray-500">
                选中: {formatTime(outPoint - inPoint)}
              </span>
              <button
                onClick={() => onTrim(inPoint, outPoint)}
                className="ml-auto text-xs px-4 py-1.5 bg-[#f43f5e] text-white rounded hover:bg-[#e11d48]"
              >
                ✂️ 裁取片段
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

#### Step 3.2.2 合成节点

**文件**：`src/components/nodes/ComposeNode.tsx`

```tsx
import { memo, useState } from 'react'
import { type NodeProps, Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'

function ComposeNodeComponent({ id, data, selected }: NodeProps) {
  const clips = data.clips || []
  const totalDuration = clips.reduce((sum: number, c: any) => sum + (c.duration || 0), 0)

  return (
    <BaseNode
      id={id}
      data={data}
      type="compose"
      color="#6366f1"
      icon={<span className="text-sm">🎬</span>}
      title={`合成 (${clips.length}片段)`}
      selected={selected}
      inputs={[
        { id: 'video1', label: '视频1' },
        { id: 'video2', label: '视频2' },
        { id: 'video3', label: '视频3' },
        { id: 'audio', label: '音频' },
      ]}
      outputs={[{ id: 'composed', label: '成片' }]}
    >
      {/* 片段缩略列表 */}
      <div className="space-y-1 max-h-[120px] overflow-y-auto">
        {clips.map((clip: any, i: number) => (
          <div key={i} className="flex items-center gap-2 bg-[#0f3460] rounded px-2 py-1">
            <span className="text-[10px] text-gray-400">{i + 1}</span>
            <span className="text-[10px] text-white truncate flex-1">{clip.name || `片段${i + 1}`}</span>
            <span className="text-[10px] text-gray-500">{clip.duration?.toFixed(1)}s</span>
          </div>
        ))}
        {clips.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-4">
            连线视频节点到此处
          </div>
        )}
      </div>

      {/* 总时长 + 操作 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-500">总时长: {totalDuration.toFixed(1)}s</span>
        <button
          className="text-xs px-3 py-1 bg-[#6366f1] text-white rounded hover:bg-[#5254d4] disabled:opacity-50"
          disabled={clips.length === 0}
        >
          🎬 合成
        </button>
      </div>

      {/* 端口 */}
      <Handle type="target" position={Position.Left} id="video1"
        style={{ top: '25%', background: '#6366f1', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="video2"
        style={{ top: '45%', background: '#6366f1', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="video3"
        style={{ top: '65%', background: '#6366f1', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="audio"
        style={{ top: '85%', background: '#22c55e', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="composed"
        style={{ top: '50%', background: '#6366f1', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const ComposeNode = memo(ComposeNodeComponent)
```

---

### Day 5-7：时间轴编辑器

#### Step 3.3.1 时间轴组件

**文件**：`src/components/timeline/Timeline.tsx`

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'

interface Clip {
  id: string
  name: string
  path: string
  duration: number
  startTime: number    // 在时间轴上的起始时间
}

interface Track {
  id: string
  type: 'video' | 'audio'
  clips: Clip[]
}

interface Props {
  tracks: Track[]
  totalDuration: number
  onClipMove?: (trackId: string, clipId: string, newStartTime: number) => void
  onClipSelect?: (clipId: string) => void
  onCompose?: (tracks: Track[]) => void
  isComposing?: boolean
  composeProgress?: number
}

export function Timeline({ tracks, totalDuration, onClipMove, onClipSelect, onCompose, isComposing, composeProgress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [pixelsPerSecond] = useState(50)   // 缩放级别
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)

  const timelineWidth = totalDuration * pixelsPerSecond

  // 播放指针拖拽
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDraggingPlayhead(true)
  }, [])

  useEffect(() => {
    if (!isDraggingPlayhead) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - 60 // 减去标签宽度
      const time = Math.max(0, x / pixelsPerSecond)
      setPlayheadTime(time)
    }

    const handleMouseUp = () => setIsDraggingPlayhead(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingPlayhead, pixelsPerSecond])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-[#0f3460] border-t border-[#16213e]">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#16213e]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">🎬 时间轴</span>
          <span className="text-xs text-gray-500">{formatTime(playheadTime)} / {formatTime(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCompose?.(tracks)}
            disabled={isComposing || tracks.every(t => t.clips.length === 0)}
            className="text-xs px-4 py-1.5 bg-[#6366f1] text-white rounded hover:bg-[#5254d4] disabled:opacity-50 transition"
          >
            {isComposing ? `合成中 ${composeProgress || 0}%` : '🎬 合成导出'}
          </button>
        </div>
      </div>

      {/* 时间轴主体 */}
      <div ref={containerRef} className="overflow-x-auto" style={{ height: tracks.length * 50 + 30 }}>
        <div style={{ width: Math.max(timelineWidth + 100, 600), position: 'relative' }}>

          {/* 时间标尺 */}
          <div className="h-[30px] border-b border-[#16213e] relative" style={{ marginLeft: 60 }}>
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 h-full" style={{ left: i * pixelsPerSecond }}>
                <div className="w-px h-3 bg-gray-600" />
                <span className="text-[9px] text-gray-500 absolute top-3">{formatTime(i)}</span>
              </div>
            ))}
          </div>

          {/* 轨道 */}
          {tracks.map((track, trackIndex) => (
            <div key={track.id} className="flex h-[50px] border-b border-[#16213e]/50">
              {/* 轨道标签 */}
              <div className="w-[60px] flex items-center justify-center text-[10px] text-gray-500 border-r border-[#16213e]">
                {track.type === 'video' ? '🎥' : '🎵'}
              </div>

              {/* 片段区域 */}
              <div className="flex-1 relative">
                {track.clips.map(clip => (
                  <div
                    key={clip.id}
                    className="absolute top-1 h-[38px] rounded cursor-move flex items-center px-2 text-[10px] text-white truncate"
                    style={{
                      left: clip.startTime * pixelsPerSecond,
                      width: clip.duration * pixelsPerSecond - 2,
                      backgroundColor: track.type === 'video' ? '#6366f1' : '#22c55e',
                      opacity: 0.8,
                    }}
                    onClick={() => onClipSelect?.(clip.id)}
                    onMouseDown={(e) => {
                      // 片段拖拽（简化版）
                      const startX = e.clientX
                      const startLeft = clip.startTime * pixelsPerSecond

                      const handleMove = (moveEvent: MouseEvent) => {
                        const dx = moveEvent.clientX - startX
                        const newStartTime = Math.max(0, (startLeft + dx) / pixelsPerSecond)
                        onClipMove?.(track.id, clip.id, newStartTime)
                      }

                      const handleUp = () => {
                        window.removeEventListener('mousemove', handleMove)
                        window.removeEventListener('mouseup', handleUp)
                      }

                      window.addEventListener('mousemove', handleMove)
                      window.addEventListener('mouseup', handleUp)
                    }}
                  >
                    {clip.name}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 播放指针 */}
          <div
            className="absolute top-[30px] bottom-0 w-0.5 bg-red-500 z-10 cursor-col-resize"
            style={{ left: playheadTime * pixelsPerSecond + 60 }}
            onMouseDown={handlePlayheadMouseDown}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

#### Step 3.3.2 合成导出流程

**文件**：`electron/utility/services/compose-service.ts`（⚠️ 修订：从 main 移入 Utility Process）

```typescript
import { concatVideos, concatVideosReencode, mergeAudioVideo, getVideoInfo, cleanupTemp } from './ffmpeg-service'
import { join } from 'path'
import { mkdirSync, existsSync, unlinkSync } from 'fs'
import { app, BrowserWindow } from 'electron'
import { v4 as uuid } from 'uuid'

const OUTPUT_DIR = join(app.getPath('userData'), 'LocalCanvas', 'outputs')
const TEMP_DIR = join(app.getPath('userData'), 'LocalCanvas', '.temp')

export interface ComposeClip {
  id: string
  path: string
  startTime: number  // 在最终视频中的起始时间
  duration: number
}

export interface ComposeOptions {
  clips: ComposeClip[]
  audioPath?: string
  outputName?: string
  reencode?: boolean
}

/**
 * 执行视频合成
 */
export async function compose(
  options: ComposeOptions,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  mkdirSync(TEMP_DIR, { recursive: true })

  const { clips, audioPath, outputName, reencode = false } = options

  // 1. 按 startTime 排序
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)

  // 2. 拼接视频
  onProgress?.(10)
  const concatOutput = join(TEMP_DIR, `concat-${uuid()}.mp4`)
  const videoPaths = sortedClips.map(c => c.path)

  if (reencode) {
    await concatVideosReencode(videoPaths, concatOutput, (p) => onProgress?.(10 + p * 0.6))
  } else {
    // ⚠️ Bug 修正：第一个参数应为 inputs 数组 (videoPaths)，非 output
    await concatVideos(videoPaths, concatOutput, (p) => onProgress?.(10 + p * 0.6))
  }

  // 3. 如有音频，混流
  onProgress?.(80)
  let finalOutput = concatOutput

  if (audioPath && existsSync(audioPath)) {
    const mergedOutput = join(TEMP_DIR, `merged-${uuid()}.mp4`)
    await mergeAudioVideo(concatOutput, audioPath, mergedOutput)
    finalOutput = mergedOutput
    // 清理中间文件
    if (finalOutput !== concatOutput) unlinkSync(concatOutput)
  }

  // 4. 移动到输出目录
  const outputFileName = outputName || `LocalCanvas_${Date.now()}.mp4`
  const outputPath = join(OUTPUT_DIR, outputFileName)
  require('fs').renameSync(finalOutput, outputPath)

  onProgress?.(100)

  // 清理临时文件
  cleanupTemp()

  return outputPath
}
```

**验收**：多视频可拼接合成导出为 MP4，支持音频混流

---

### Day 8-9：项目管理完善

#### Step 3.4.1 项目列表页增强

**文件**：`src/components/project/StartPage.tsx`、`ProjectCard.tsx`

在 v1 基础上已实现：

- **项目缩略图**：保存项目时异步生成 `projects/{id}/thumbnail.jpg`（优先画布图片/视频节点，否则取资产目录首项）；`ProjectCard` 通过 `project:readThumbnail` 加载
- **项目创建/更新时间**：卡片展示 `createdAt`、`updatedAt`
- **右键菜单**：重命名、打开目录、删除（`projectExtra.rename` / `openDir`）
- **拖拽排序**：HTML5 DnD + SQLite `list_order` 列 + `project:reorder` IPC

**数据库迁移**（`electron/main/database/index.ts`）：为已有库自动 `ALTER TABLE` 增加 `list_order` 并按 `updated_at` 初始化顺序。

#### Step 3.4.2 资产面板完善

**文件**：`src/components/sidebar/AssetPanel.tsx`

```tsx
import { useState, useEffect } from 'react'

export function AssetPanel() {
  const [assets, setAssets] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all')

  useEffect(() => {
    // 从主进程获取资产列表
    loadAssets()
  }, [])

  const loadAssets = async () => {
    // IPC 调用获取项目资产
    // const list = await window.api.asset.list(currentProjectId)
    // setAssets(list)
  }

  const handleImport = async () => {
    const filePaths = await window.api.file.selectFile([
      { name: '媒体文件', extensions: ['png', 'jpg', 'jpeg', 'mp4', 'mov', 'mp3', 'wav'] },
    ])
    if (filePaths) {
      // 导入资产到项目
      for (const path of filePaths) {
        await window.api.asset.import(path)
      }
      loadAssets()
    }
  }

  const filteredAssets = filter === 'all'
    ? assets
    : assets.filter(a => a.type === filter)

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {['all', 'image', 'video', 'audio'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`text-[10px] px-2 py-0.5 rounded ${filter === f ? 'bg-[#6366f1] text-white' : 'text-gray-500 hover:text-white'}`}>
              {{ all: '全部', image: '🖼️', video: '🎥', audio: '🎵' }[f]}
            </button>
          ))}
        </div>
        <button onClick={handleImport} className="text-[10px] text-[#6366f1] hover:underline">+ 导入</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filteredAssets.map(asset => (
          <div
            key={asset.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/localcanvas', JSON.stringify(asset))
            }}
            className="bg-[#0f3460] rounded p-2 cursor-grab hover:border-[#6366f1] border border-transparent transition"
          >
            {asset.type === 'image' && (
              <img src={asset.thumbnail || asset.path} className="w-full h-16 object-cover rounded" />
            )}
            {asset.type === 'video' && (
              <div className="w-full h-16 bg-[#1a1a2e] rounded flex items-center justify-center">
                🎥 {asset.duration?.toFixed(1)}s
              </div>
            )}
            {asset.type === 'audio' && (
              <div className="w-full h-16 bg-[#1a1a2e] rounded flex items-center justify-center">
                🎵
              </div>
            )}
            <div className="text-[9px] text-gray-400 mt-1 truncate">{asset.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Day 10-11：主题完善

#### Step 3.5.1 主题切换系统

**文件**：`src/stores/themeStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'localcanvas-theme' }
  )
)
```

**文件**：`src/styles/theme-light.css`

```css
:root[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent: #6366f1;
  --accent-hover: #5254d4;
  --border: #e2e8f0;
}
```

---

### Day 12：性能优化 + 联调

#### Step 3.6.1 画布性能优化

- React Flow `nodeExtent` 限制节点范围
- 节点数 > 100 时启用 viewport culling
- 缩略图缓存避免重复读取大文件

#### Step 3.6.2 缩略图缓存服务

**文件**：`electron/main/services/thumbnail.ts`

```typescript
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import { generateThumbnail } from './ffmpeg-service'

const THUMB_DIR = join(app.getPath('userData'), 'LocalCanvas', 'thumbnails')

const thumbCache = new Map<string, string>()

export async function getThumbnail(filePath: string): Promise<string> {
  if (thumbCache.has(filePath)) return thumbCache.get(filePath)!

  // 生成缓存 key
  const stat = require('fs').statSync(filePath)
  const cacheKey = `${filePath}-${stat.mtimeMs}`
  const cachePath = join(THUMB_DIR, `${require('crypto').createHash('md5').update(cacheKey).digest('hex')}.jpg`)

  if (existsSync(cachePath)) {
    thumbCache.set(filePath, cachePath)
    return cachePath
  }

  // 生成缩略图
  const thumbPath = await generateThumbnail(filePath, 0.5, cachePath)
  thumbCache.set(filePath, thumbPath)
  return thumbPath
}
```

---

## 四、测试要点

| 测试场景 | 操作 | 预期结果 |
|----------|------|----------|
| FFmpeg 检测 | 启动应用 | 自动检测或提示下载 |
| 视频裁取 | 双击视频→设置入出点→裁取 | 新视频节点包含裁取片段 |
| 合成节点 | 连线多视频到合成节点 | 合成节点显示片段列表 |
| 时间轴 | 选中合成节点→打开时间轴 | 轨道+片段正确显示 |
| 片段拖拽 | 在时间轴拖拽片段 | 片段位置更新 |
| 合成导出 | 点击合成→导出 | MP4 文件生成，右侧自动创建视频节点 |
| 音频混合 | 连线音频+视频→合成 | 音频混入视频 |
| 播放指针预览 | 拖动时间轴红色指针 | 上方预览区显示当前片段对应帧 |
| FFmpeg 缺失 | 首次裁切/合成且无 FFmpeg | 弹窗引导选择二进制或打开下载页 |
| 项目排序 | 首页拖拽项目卡片 | 顺序持久化，刷新后保持 |
| 项目缩略图 | 保存含图片/视频节点的项目 | 首页卡片显示缩略图 |
| 主题切换 | 点击主题切换 | 深色/浅色切换正常 |
| 资产导入 | 点击导入文件 | 文件出现在资产面板 |
| 视频缩略图 | 资产面板查看视频 | 显示 FFmpeg 首帧缩略图 |
| 拖拽资产 | 从资产面板拖到画布 | 对应节点创建 |
| 单元测试 | `npm test` | 41 项 vitest 通过 |
| E2E 冒烟 | `npm run test:e2e:full` | Playwright：Electron 启动 + 合成 clip 映射 |

---

## 五、v3 验收标准

- [x] FFmpeg 可检测/配置路径（跨平台：Windows/macOS/Linux）
- [x] FFmpeg 可一键自动下载（`ffmpeg:download` + 设置页 / ensure 对话框）
- [x] FFmpeg 操作在 Utility Process 中执行，不阻塞主进程
- [x] 裁切/合成前主进程 `ensureFFmpeg` 引导（`electron/main/services/ffmpeg-setup.ts`）
- [x] ensure / 下载成功后路径自动写入 `settings.ffmpeg_path`（`ffmpeg-config.ts`）
- [x] 拼接前自动检测编码一致性（`validateConcatCompatibility`）
- [x] 视频可预览播放（`VideoPreview.tsx`）
- [x] 视频可裁取片段（`ffmpeg:trim` + 视频节点入出点）
- [x] 合成节点可接收多个视频+音频连线
- [x] 时间轴编辑器可用（`TimelinePanel` 底部浮层）
- [x] 片段可拖拽调整位置
- [x] 播放指针可拖动，并联动 `TimelinePreview` 预览当前片段
- [x] 多视频可拼接合成导出 MP4（`concatVideos` 参数已修正）
- [x] 合成完成后自动创建视频节点并连线
- [x] 音频可混入视频
- [x] 深色/浅色主题切换（CSS Variables 令牌化）
- [x] 资产面板可浏览/导入/拖拽使用
- [x] 资产面板视频项显示缩略图（`asset:thumbnail`）
- [x] 项目列表页完善（创建/更新时间、右键菜单、拖拽排序）
- [x] 项目缩略图（保存时生成，`project:readThumbnail`）
- [x] 大节点数下画布不卡顿（React Flow `onlyRenderVisibleElements`）
- [x] Timeline 可见区间 culling（`timelineVisibleClips.ts`，100+ 片段场景）
- [x] 单元测试覆盖合成 clip 映射、指针定位、可见区 culling
- [x] E2E 测试覆盖 Electron 启动与合成流程 smoke（`e2e/*.spec.ts`）

---

## 六、v3 → v4 衔接说明

v3 完成后，应用具备完整的「创作 → 剪辑 → 合成 → 导出」全链路（**验收 100%**）。v4 将聚焦高级功能和发布：

| v3 产出 | v4 扩展 |
|---------|---------|
| ComfyUI + OpenAI 兼容 | Replicate + 自定义 HTTP 适配器 |
| 无生成历史 | SQLite 生成历史 + 搜索/复用 |
| 工作流文件保存（`file:saveWorkflow`） | 工作流模板 UI + 分享 |
| 基础错误处理 + ErrorBoundary | 完善重试/超时/离线检测 |
| 开发模式运行 | 打包安装 + 自动更新 |
| v3 设计文档 | README + 快速入门指南 |
| FFmpeg 手动安装 + ensure 引导 | 已完成：按需下载 + 路径自动持久化 |
| vitest 单元测试 | Playwright E2E 扩展（完整合成 UI 流程） |

---

## 七、v3 架构修订补丁

> 以下为根据项目评审补充的修订项。

### 7.1 已修复的 Bug

**concatVideos 参数错误**（compose-service.ts）：

```typescript
// ❌ 原版（Bug）：第一个参数传了 output，导致 inputs 为空
await concatVideos(concatOutput, concatOutput, (p) => onProgress?.(10 + p * 0.6))

// ✅ 修正：第一个参数应为 inputs 数组
await concatVideos(videoPaths, concatOutput, (p) => onProgress?.(10 + p * 0.6))
```

### 7.2 FFmpeg 安装包体积优化（已实现）

FFmpeg 二进制约 80-120MB，**不打包进安装包**。当前实现策略：

1. **检测优先级**：设置页 `ffmpeg_path` → 内置路径 → 系统 PATH → 直接调用 `ffmpeg`
2. **缺失引导**：主进程 `electron/main/services/ffmpeg-setup.ts` 的 `ensureFFmpeg()`，在 `ffmpeg:trim` / `compose:start` 前调用
3. **对话框选项**：选择 `ffmpeg` 可执行文件 / 打开 [ffmpeg.org 下载页](https://ffmpeg.org/download.html) / 取消
4. **自动下载**：`electron/utility/services/ffmpeg-download.ts` 按平台下载 zip/tar.xz 并解压至 `userData/LocalCanvas/bin/`；`ffmpeg:download` IPC + 设置页「下载安装」
5. **路径持久化**：`electron/main/services/ffmpeg-config.ts` — ensure / 下载成功后写入 `settings.ffmpeg_path`

**IPC**：`ffmpeg:ensure` / `ffmpeg:download` → `{ ok: true, path } | { ok: false, reason }`；Preload 暴露为 `window.api.ffmpeg.ensure()` / `.download()`。

### 7.3 Timeline 可见区间 culling（已实现）

大时间轴（100+ 片段）通过 **可见时间窗口 culling** 优化，仅渲染 scroll 视口内片段：

```typescript
// src/utils/timelineVisibleClips.ts
export function filterClipsInTimeRange(clips, rangeStart, rangeEnd) { ... }
export function visibleTimeRangeFromScroll(scrollLeft, viewportWidth, ...) { ... }
```

`Timeline.tsx` 监听横向 scroll，调用 `filterClipsInTimeRange` 后再渲染 clip DOM。

画布侧：`Canvas.tsx` 启用 React Flow `onlyRenderVisibleElements` 减少大项目 DOM 压力。

### 7.4 CSS Variables 主题令牌化

v3 文档中硬编码的色值（`#0f3460`, `#16213e`, `#6366f1` 等）需替换为 CSS Variables。与 v1 的 9.7 节保持一致，所有组件使用 `var(--color-xxx)` 而非硬编码值。

### 7.5 compose-service.ts 完整修订版

```typescript
// electron/utility/services/compose-service.ts
// ⚠️ 修订：运行在 Utility Process，通过 MessagePort 通信

import { concatVideos, concatVideosReencode, mergeAudioVideo, getVideoInfo, cleanupTemp, validateConcatCompatibility } from './ffmpeg-service'
import { join } from 'path'
import { mkdirSync, existsSync, unlinkSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { app } from 'electron'

const OUTPUT_DIR = join(app.getPath('userData'), 'LocalCanvas', 'outputs')
const TEMP_DIR = join(app.getPath('userData'), 'LocalCanvas', '.temp')

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
  reencode?: boolean  // ⚠️ 修订：默认 false，仅编码不一致时自动切换
}

/**
 * 执行视频合成
 * ⚠️ 修订：增加编码一致性检测，自动决定是否 reencode
 */
export async function compose(
  options: ComposeOptions,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  mkdirSync(TEMP_DIR, { recursive: true })

  const { clips, audioPath, outputName } = options
  let { reencode = false } = options

  // 1. 按 startTime 排序
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)
  const videoPaths = sortedClips.map(c => c.path)

  // 2. ⚠️ 新增：编码一致性检测
  if (!reencode) {
    const { compatible, issues } = await validateConcatCompatibility(videoPaths)
    if (!compatible) {
      logger.warn('Video codec mismatch, falling back to re-encode', { issues })
      reencode = true  // 自动降级为重编码模式
    }
  }

  // 3. 拼接视频
  onProgress?.(10)
  const concatOutput = join(TEMP_DIR, `concat-${uuid()}.mp4`)

  if (reencode) {
    await concatVideosReencode(videoPaths, concatOutput, (p) => onProgress?.(10 + p * 0.6))
  } else {
    // ✅ Bug 已修正：videoPaths 作为第一个参数
    await concatVideos(videoPaths, concatOutput, (p) => onProgress?.(10 + p * 0.6))
  }

  // 4. 如有音频，混流
  onProgress?.(80)
  let finalOutput = concatOutput

  if (audioPath && existsSync(audioPath)) {
    const mergedOutput = join(TEMP_DIR, `merged-${uuid()}.mp4`)
    await mergeAudioVideo(concatOutput, audioPath, mergedOutput)
    finalOutput = mergedOutput
    if (finalOutput !== concatOutput) {
      try { unlinkSync(concatOutput) } catch { /* ignore */ }
    }
  }

  // 5. 移动到输出目录
  const outputFileName = outputName || `LocalCanvas_${Date.now()}.mp4`
  const outputPath = join(OUTPUT_DIR, outputFileName)
  require('fs').renameSync(finalOutput, outputPath)

  onProgress?.(100)
  cleanupTemp()

  return outputPath
}
```

---

## 八、v3 缺口补全记录（2026-06-04）

> 在核心链路可用后，按验收缺口逐项补全，以下为实际落地说明。

### 8.1 播放指针 + 预览联动

| 项 | 实现 |
|----|------|
| 播放指针回调 | `Timeline` 新增 `onPlayheadChange`，拖动红色指针时上报时间 |
| 片段定位 | `src/utils/timelineClipAtTime.ts` — `findClipAtTime(clips, time)` |
| 预览组件 | `TimelinePreview.tsx` — 解析 `file://` 路径，按片段内 offset seek |
| 集成 | `TimelinePanel` 解析 clip 绝对路径，预览条置于时间轴上方 |

### 8.2 项目管理

| 项 | 实现 |
|----|------|
| 排序 | DB `list_order` + `reorderProjects()` + `project:reorder` |
| 缩略图 | `refreshProjectThumbnail()` 写入 `thumbnail.jpg`；`listProjects` 返回 `hasThumbnail` |
| 展示 | `ProjectCard` 调用 `project:readThumbnail` 渲染 Blob URL |
| 交互 | `StartPage` HTML5 拖拽重排项目卡片 |

### 8.3 资产与测试

| 项 | 实现 |
|----|------|
| 视频缩略图 | `AssetPanel` 中 `VideoAssetThumbnail`：`asset:thumbnail` + `file:readAbsolutePath` |
| 单元测试 | 41 项 vitest（含 `timelineVisibleClips`、`composeClips`、`timelineClipAtTime`） |
| E2E | `e2e/app.spec.ts`（Electron 启动）、`e2e/compose-smoke.spec.ts`（合成 clip 映射） |

### 8.4 v3 收尾（2026-06-04 第二轮）

| 项 | 实现 |
|----|------|
| FFmpeg 自动下载 | `ffmpeg-download.ts` + `ffmpeg:download` + 设置页 / ensure 对话框 |
| 路径持久化 | `persistFfmpegPath()` — ensure / 下载后写入 config |
| 画布性能 | `Canvas.tsx` — `onlyRenderVisibleElements` |
| 时间轴性能 | `timelineVisibleClips.ts` — scroll 可见区间 culling |
| Playwright | `playwright.config.ts` + `npm run test:e2e` / `test:e2e:full` |

---

<!-- §八 重复段落已合并删除 -->
