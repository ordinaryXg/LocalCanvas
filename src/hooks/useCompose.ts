import { useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { handleError } from '../utils/ErrorHandler'
import { importGeneratedMedia } from '../utils/generatedMedia'
import { generateNodeId } from '../utils/id'
import type { ComposeClip } from '../types/ipc'
import type { ComposeClipItem } from '../types/node'
import { applySequentialStartTimes, getActiveClips } from '../utils/composeSequence'

export async function resolveAssetAbsolutePath(
  projectId: string,
  relativePath: string,
): Promise<string> {
  return window.api.file.resolveAssetPath(projectId, relativePath)
}

export function useComposeProgress(onProgress: (pct: number) => void): () => void {
  useEffect(() => {
    const unsub = window.api.on('compose:progress', (...args: unknown[]) => {
      const event = args[0] as { percentage: number }
      onProgress(event.percentage)
    })
    return unsub
  }, [onProgress])
}

export async function runCompose(
  projectId: string,
  clips: Array<{
    id: string
    assetPath?: string
    absolutePath?: string
    startTime: number
    duration: number
  }>,
  audioAssetPath?: string,
  outputName?: string,
  reencode?: boolean,
  subtitlePath?: string,
  burnSubtitles?: boolean,
  audioVolume?: number,
  audioFadeIn?: number,
  audioFadeOut?: number,
): Promise<string> {
  const resolvedClips: ComposeClip[] = []

  for (const clip of clips) {
    let path = clip.absolutePath
    if (!path && clip.assetPath) {
      path = await resolveAssetAbsolutePath(projectId, clip.assetPath)
    }
    if (!path) continue
    resolvedClips.push({
      id: clip.id,
      path,
      startTime: clip.startTime,
      duration: clip.duration,
      trimIn: clip.trimIn,
    })
  }

  if (resolvedClips.length === 0) {
    throw new Error('没有可合成的视频片段')
  }

  let audioPath: string | undefined
  if (audioAssetPath) {
    audioPath = await resolveAssetAbsolutePath(projectId, audioAssetPath)
  }

  const result = await window.api.compose.start({
    clips: resolvedClips,
    audioPath,
    audioVolume,
    audioFadeIn,
    audioFadeOut,
    outputName,
    reencode,
    subtitlePath,
    burnSubtitles,
  })

  return result.outputPath
}

export async function finishComposeAndCreateVideoNode(
  composeNodeId: string,
  outputPath: string,
  projectId: string,
): Promise<string> {
  const media = await importGeneratedMedia(projectId, 'video', outputPath)
  const store = useCanvasStore.getState()
  const composeNode = store.nodes.find((n) => n.id === composeNodeId)
  if (!composeNode) throw new Error('合成节点不存在')

  const composeWidth = composeNode.width ?? composeNode.measured?.width ?? 260
  const newNodeId = generateNodeId('video')

  store.addNode({
    id: newNodeId,
    type: 'video',
    position: {
      x: composeNode.position.x + composeWidth + 80,
      y: composeNode.position.y,
    },
    width: 280,
    height: 360,
    data: {
      videoSrc: media.src,
      videoAssetPath: media.assetPath,
      fileName: media.fileName || 'composed.mp4',
    },
  })

  store.addConnection({
    source: composeNodeId,
    target: newNodeId,
    sourceHandle: 'composed',
    targetHandle: 'video',
  })

  store.updateNodeData(composeNodeId, {
    outputPath,
    showTimeline: false,
    composeProgress: 100,
  })

  return newNodeId
}

export function clipsFromComposeNode(clips: ComposeClipItem[] | undefined) {
  const active = applySequentialStartTimes(getActiveClips(clips ?? []))
  return active.map((c, i) => ({
    id: c.id || `clip-${i}`,
    assetPath: c.assetPath,
    absolutePath: c.absolutePath,
    startTime: c.startTime ?? 0,
    duration: c.duration || 5,
    trimIn: c.trimIn ?? 0,
  }))
}

export async function trimVideoAsset(
  projectId: string,
  absoluteInput: string,
  startTime: number,
  endTime: number,
): Promise<{ relativePath: string; blobUrl: string }> {
  const result = await window.api.ffmpeg.trim({
    input: absoluteInput,
    startTime,
    endTime,
    projectId,
  })

  const buffer = await window.api.file.readAsset(projectId, result.relativePath)
  const blob = new Blob([buffer], { type: 'video/mp4' })
  return {
    relativePath: result.relativePath,
    blobUrl: URL.createObjectURL(blob),
  }
}

export async function detectFfmpeg(): Promise<string | null> {
  try {
    const result = await window.api.ffmpeg.detect()
    return result.path
  } catch (error) {
    handleError(error, 'ffmpegDetect')
    return null
  }
}
