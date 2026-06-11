import type { Edge, Node } from '@xyflow/react'
import type { ComposeClipItem } from '../types/node'
import type { StoryboardFrame } from '../types/storyboard'
import {
  applySequentialStartTimes,
  clipIdFromEdge,
  isComposeVideoHandle,
  normalizeClip,
  videoHandleFromIndex,
} from './composeSequence'
import { resolveFrameActiveMedia } from './storyboardTakes'

const MAX_COMPOSE_SLOTS = 6

export interface ComposeStoryboardWireResult {
  edgesToAdd: Array<{
    source: string
    target: string
    sourceHandle: string
    targetHandle: string
  }>
  edgeIdsToRemove: string[]
  composeClips: ComposeClipItem[]
  wiredCount: number
  skippedCount: number
}

export function wireComposeToStoryboardSelectedTakes(
  frames: StoryboardFrame[],
  composeNodeId: string,
  nodes: Node[],
  edges: Edge[],
): ComposeStoryboardWireResult {
  const composeNode = nodes.find((n) => n.id === composeNodeId)
  if (!composeNode) {
    return {
      edgesToAdd: [],
      edgeIdsToRemove: [],
      composeClips: [],
      wiredCount: 0,
      skippedCount: 0,
    }
  }

  const sorted = [...frames].sort((a, b) => a.sequence - b.sequence)
  const slotFrames = sorted.slice(0, MAX_COMPOSE_SLOTS)
  const existingClips = ((composeNode.data.clips as ComposeClipItem[]) ?? []).slice()

  const edgeIdsToRemove = edges
    .filter((e) => e.target === composeNodeId && isComposeVideoHandle(e.targetHandle))
    .map((e) => e.id)

  const edgesToAdd: ComposeStoryboardWireResult['edgesToAdd'] = []
  const clips: ComposeClipItem[] = []
  let wiredCount = 0
  let skippedCount = 0

  for (let i = 0; i < slotFrames.length; i++) {
    const frame = slotFrames[i]
    const handle = videoHandleFromIndex(i)
    const media = resolveFrameActiveMedia(frame)
    const videoNodeId = media.videoNodeId
    const fallbackName = existingClips[i]?.name ?? `video${i + 1}`

    if (!videoNodeId) {
      skippedCount++
      clips.push(
        normalizeClip({
          id: existingClips[i]?.id ?? `slot-${i + 1}`,
          name: fallbackName,
          duration: 0,
          excluded: true,
        }),
      )
      continue
    }

    const videoNode = nodes.find((n) => n.id === videoNodeId)
    if (!videoNode || videoNode.type !== 'video') {
      skippedCount++
      clips.push(
        normalizeClip({
          id: existingClips[i]?.id ?? `slot-${i + 1}`,
          name: fallbackName,
          duration: 0,
          excluded: true,
        }),
      )
      continue
    }

    const sourceDuration = (videoNode.data.duration as number) || frame.duration || 5
    const clipId = clipIdFromEdge(videoNodeId, handle)
    clips.push(
      normalizeClip({
        id: clipId,
        sourceNodeId: videoNodeId,
        name: (videoNode.data.fileName as string) || `镜 ${frame.sequence}`,
        assetPath: (videoNode.data.videoAssetPath as string | undefined) ?? media.videoPath,
        sourceDuration,
        duration: Math.min(frame.duration || sourceDuration, sourceDuration),
        trimIn: 0,
        excluded: false,
      }),
    )

    edgesToAdd.push({
      source: videoNodeId,
      sourceHandle: 'video',
      target: composeNodeId,
      targetHandle: handle,
    })
    wiredCount++
  }

  return {
    edgesToAdd,
    edgeIdsToRemove,
    composeClips: applySequentialStartTimes(clips),
    wiredCount,
    skippedCount,
  }
}
