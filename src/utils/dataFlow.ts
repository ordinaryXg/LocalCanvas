import type { Node, Edge } from '@xyflow/react'
import type { ComposeClipItem, ScriptRow } from '../types/node'
import {
  applySequentialStartTimes,
  clipIdFromEdge,
  isComposeVideoHandle,
  normalizeClip,
} from './composeSequence'
import { textNodeOutput } from './textNodeOutput'
import { isImageReferenceHandle, listImageReferenceEdges } from './videoReferenceSlots'

export interface DataFlowPatch {
  nodeId: string
  data: Record<string, unknown>
}

function scriptToPromptText(data: Record<string, unknown>): string {
  const rows = (data.scriptRows as ScriptRow[] | undefined) ?? []
  const fromRows = rows
    .map((r) => r.prompt?.trim())
    .filter(Boolean)
    .join('\n')
  if (fromRows) return fromRows
  const story = data.storyInput
  return typeof story === 'string' ? story : ''
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return (a ?? '') === (b ?? '')
}

function imageNodeOutput(source: Node): { src?: string; assetPath?: string } {
  const data = source.data as Record<string, unknown>
  return {
    src: data.imageSrc as string | undefined,
    assetPath: data.imageAssetPath as string | undefined,
  }
}

function isDataFlowEdge(source: Node, target: Node, targetHandle: string | null | undefined): boolean {
  if (!targetHandle) return false
  if (source.type === 'text' && targetHandle === 'prompt') {
    return target.type === 'image' || target.type === 'video'
  }
  if (source.type === 'script' && targetHandle === 'prompt') {
    return target.type === 'image' || target.type === 'video'
  }
  if (source.type === 'image' && target.type === 'image' && isImageReferenceHandle(targetHandle)) {
    return true
  }
  if (source.type === 'image' && target.type === 'video') {
    return targetHandle === 'firstFrame' || targetHandle === 'lastFrame'
  }
  if (source.type === 'audio' && target.type === 'video' && targetHandle === 'audio') {
    return true
  }
  if (source.type === 'video' && target.type === 'compose') {
    return isComposeVideoHandle(targetHandle)
  }
  if (source.type === 'video' && target.type === 'video' && targetHandle === 'video') {
    return true
  }
  if (source.type === 'compose' && target.type === 'video' && targetHandle === 'video') {
    return true
  }
  if (source.type === 'audio' && target.type === 'compose' && targetHandle === 'audio') {
    return true
  }
  return false
}

/** 同一目标端口只保留最后一条连线，避免多源写入互相覆盖导致无限更新 */
function resolveDataFlowEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const slotMap = new Map<string, Edge>()

  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) continue
    if (!isDataFlowEdge(sourceNode, targetNode, edge.targetHandle)) continue
    slotMap.set(`${edge.target}:${edge.targetHandle}`, edge)
  }

  return [...slotMap.values()]
}

/**
 * 根据当前连线计算目标节点应写入的 data 补丁（纯函数，便于单测）
 */
export function computeDataFlowPatches(nodes: Node[], edges: Edge[]): DataFlowPatch[] {
  const patches: DataFlowPatch[] = []
  const patchMap = new Map<string, Record<string, unknown>>()

  const mergePatch = (nodeId: string, data: Record<string, unknown>) => {
    const existing = patchMap.get(nodeId) ?? {}
    patchMap.set(nodeId, { ...existing, ...data })
  }

  for (const edge of resolveDataFlowEdges(nodes, edges)) {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) continue

    const targetHandle = edge.targetHandle
    const sourceHandle = edge.sourceHandle
    const targetData = targetNode.data as Record<string, unknown>

    if (sourceNode.type === 'text' && targetHandle === 'prompt') {
      if (targetNode.type === 'image' || targetNode.type === 'video') {
        const content = textNodeOutput(sourceNode.data as Record<string, unknown>)
        if (!valuesEqual(targetData.prompt, content)) {
          mergePatch(targetNode.id, { prompt: content })
        }
      }
    }

    if (sourceNode.type === 'script' && targetHandle === 'prompt') {
      if (targetNode.type === 'image' || targetNode.type === 'video') {
        const text = scriptToPromptText(sourceNode.data as Record<string, unknown>)
        if (!valuesEqual(targetData.prompt, text)) {
          mergePatch(targetNode.id, { prompt: text })
        }
      }
    }

    if (
      sourceNode.type === 'image' &&
      targetNode.type === 'image' &&
      isImageReferenceHandle(targetHandle)
    ) {
      const out = imageNodeOutput(sourceNode)
      if (out.src && !valuesEqual(targetData.referenceSrc, out.src)) {
        mergePatch(targetNode.id, {
          referenceSrc: out.src,
          referenceAssetPath: out.assetPath,
        })
      }
    }

    if (sourceNode.type === 'image' && targetNode.type === 'video') {
      const out = imageNodeOutput(sourceNode)
      if (targetHandle === 'firstFrame' && (out.src || out.assetPath)) {
        const patch: Record<string, unknown> = {}
        if (out.src && !valuesEqual(targetData.firstFrameSrc, out.src)) {
          patch.firstFrameSrc = out.src
        }
        if (out.assetPath && !valuesEqual(targetData.firstFrameAssetPath, out.assetPath)) {
          patch.firstFrameAssetPath = out.assetPath
        }
        if (Object.keys(patch).length > 0) mergePatch(targetNode.id, patch)
      }
      if (targetHandle === 'lastFrame' && (out.src || out.assetPath)) {
        const patch: Record<string, unknown> = {}
        if (out.src && !valuesEqual(targetData.lastFrameSrc, out.src)) {
          patch.lastFrameSrc = out.src
        }
        if (out.assetPath && !valuesEqual(targetData.lastFrameAssetPath, out.assetPath)) {
          patch.lastFrameAssetPath = out.assetPath
        }
        if (Object.keys(patch).length > 0) mergePatch(targetNode.id, patch)
      }
    }

    if (sourceNode.type === 'audio' && targetNode.type === 'video' && targetHandle === 'audio') {
      const audioSrc = sourceNode.data.audioSrc
      const audioAssetPath = sourceNode.data.audioAssetPath
      if (
        !valuesEqual(targetData.audioSrc, audioSrc) ||
        !valuesEqual(targetData.audioAssetPath, audioAssetPath)
      ) {
        mergePatch(targetNode.id, {
          audioSrc,
          audioAssetPath,
        })
      }
    }

    if (
      sourceNode.type === 'video' &&
      targetNode.type === 'compose' &&
      isComposeVideoHandle(targetHandle)
    ) {
      const handle = targetHandle!
      const existingClips = ((targetData.clips as ComposeClipItem[]) ?? []).slice()
      const clipId = clipIdFromEdge(edge.source, handle)
      const idx = existingClips.findIndex((c) => c.id === clipId)
      const sourceDuration = (sourceNode.data.duration as number) || 5
      const prev = idx >= 0 ? existingClips[idx] : undefined
      const newClip = normalizeClip({
        id: clipId,
        sourceNodeId: edge.source,
        name: (sourceNode.data.fileName as string) || '视频',
        assetPath: sourceNode.data.videoAssetPath as string | undefined,
        sourceDuration,
        duration: prev?.duration ?? sourceDuration,
        trimIn: prev?.trimIn ?? 0,
        excluded: prev?.excluded ?? false,
      })

      const nextClips =
        idx >= 0
          ? existingClips.map((c, i) => (i === idx ? { ...c, ...newClip } : c))
          : [...existingClips, newClip]

      const clipsJson = JSON.stringify(applySequentialStartTimes(nextClips))
      const currentJson = JSON.stringify((targetData.clips as unknown[]) ?? [])
      if (clipsJson !== currentJson) {
        mergePatch(targetNode.id, { clips: applySequentialStartTimes(nextClips) })
      }
    }

    if (sourceNode.type === 'audio' && targetNode.type === 'compose' && targetHandle === 'audio') {
      const audioSrc = sourceNode.data.audioSrc
      const audioAssetPath = sourceNode.data.audioAssetPath
      if (
        !valuesEqual(targetData.audioSrc, audioSrc) ||
        !valuesEqual(targetData.audioAssetPath, audioAssetPath)
      ) {
        mergePatch(targetNode.id, {
          audioSrc,
          audioAssetPath,
        })
      }
    }

    if (sourceNode.type === 'video' && targetNode.type === 'video' && targetHandle === 'video') {
      const patch: Record<string, unknown> = {}
      if (!valuesEqual(targetData.videoSrc, sourceNode.data.videoSrc)) {
        patch.videoSrc = sourceNode.data.videoSrc
      }
      if (!valuesEqual(targetData.videoAssetPath, sourceNode.data.videoAssetPath)) {
        patch.videoAssetPath = sourceNode.data.videoAssetPath
      }
      if (!valuesEqual(targetData.fileName, sourceNode.data.fileName)) {
        patch.fileName = sourceNode.data.fileName
      }
      if (!valuesEqual(targetData.duration, sourceNode.data.duration)) {
        patch.duration = sourceNode.data.duration
      }
      if (Object.keys(patch).length > 0) {
        mergePatch(targetNode.id, patch)
      }
    }

    if (
      sourceNode.type === 'compose' &&
      targetNode.type === 'video' &&
      targetHandle === 'video' &&
      sourceHandle === 'composed'
    ) {
      const outputPath = sourceNode.data.outputPath
      if (typeof outputPath === 'string' && outputPath.length > 0) {
        if (!valuesEqual(targetData.composedOutputPath, outputPath)) {
          mergePatch(targetNode.id, { composedOutputPath: outputPath })
        }
      }
    }
  }

  const activeEdges = resolveDataFlowEdges(nodes, edges)

  const hasIncoming = (nodeId: string, handle: string) =>
    activeEdges.some((e) => e.target === nodeId && e.targetHandle === handle)

  for (const node of nodes) {
    const data = node.data as Record<string, unknown>

    if (node.type === 'video') {
      if (!hasIncoming(node.id, 'firstFrame')) {
        if (data.firstFrameSrc || data.firstFrameAssetPath) {
          mergePatch(node.id, { firstFrameSrc: undefined, firstFrameAssetPath: undefined })
        }
      }
      if (!hasIncoming(node.id, 'lastFrame')) {
        if (data.lastFrameSrc || data.lastFrameAssetPath) {
          mergePatch(node.id, { lastFrameSrc: undefined, lastFrameAssetPath: undefined })
        }
      }
      if (!hasIncoming(node.id, 'audio')) {
        if (data.audioSrc || data.audioAssetPath) {
          mergePatch(node.id, { audioSrc: undefined, audioAssetPath: undefined })
        }
      }
      if (!hasIncoming(node.id, 'video')) {
        if (data.composedOutputPath) {
          mergePatch(node.id, { composedOutputPath: undefined })
        }
      }
    }

    if (node.type === 'image' && listImageReferenceEdges(activeEdges, node.id).length === 0) {
      if (data.referenceSrc || data.referenceAssetPath) {
        mergePatch(node.id, { referenceSrc: undefined, referenceAssetPath: undefined })
      }
    }

    if ((node.type === 'image' || node.type === 'video') && !hasIncoming(node.id, 'prompt')) {
      if (data.prompt !== undefined && data.prompt !== '') {
        mergePatch(node.id, { prompt: undefined })
      }
    }

    if (node.type === 'compose') {
      const videoEdges = activeEdges.filter(
        (e) => e.target === node.id && isComposeVideoHandle(e.targetHandle),
      )
      const activeIds = new Set(
        videoEdges.map((e) => clipIdFromEdge(e.source, e.targetHandle!)),
      )
      const existingClips = ((data.clips as ComposeClipItem[]) ?? []).slice()
      let clips = existingClips.filter((c) => activeIds.has(c.id))

      for (const edge of videoEdges) {
        const source = nodes.find((n) => n.id === edge.source)
        if (!source || source.type !== 'video') continue
        const handle = edge.targetHandle!
        const clipId = clipIdFromEdge(edge.source, handle)
        const idx = clips.findIndex((c) => c.id === clipId)
        const sourceDuration = (source.data.duration as number) || 5
        const prev = idx >= 0 ? clips[idx] : undefined
        const trimIn = prev?.trimIn ?? 0
        const maxDuration = Math.max(0.5, sourceDuration - trimIn)
        const patch = normalizeClip({
          id: clipId,
          sourceNodeId: edge.source,
          name: (source.data.fileName as string) || '视频',
          assetPath: source.data.videoAssetPath as string | undefined,
          sourceDuration,
          duration: Math.min(prev?.duration ?? sourceDuration, maxDuration),
          trimIn,
          excluded: prev?.excluded ?? false,
        })
        if (idx >= 0) clips[idx] = { ...clips[idx], ...patch }
        else clips.push(patch)
      }

      const nextClips = applySequentialStartTimes(clips)
      const currentJson = JSON.stringify((data.clips as unknown[]) ?? [])
      const nextJson = JSON.stringify(nextClips)
      if (currentJson !== nextJson) {
        mergePatch(node.id, { clips: nextClips })
      }

      if (!hasIncoming(node.id, 'audio')) {
        if (data.audioAssetPath || data.audioSrc) {
          mergePatch(node.id, { audioAssetPath: undefined, audioSrc: undefined })
        }
      }
    }
  }

  for (const [nodeId, data] of patchMap) {
    patches.push({ nodeId, data })
  }
  return patches
}

/** 模拟多次 dataFlow 应用，用于测试是否收敛 */
export function simulateDataFlowUntilStable(
  nodes: Node[],
  edges: Edge[],
  maxIterations = 20,
): { nodes: Node[]; iterations: number } {
  let current = nodes
  let iterations = 0

  for (let i = 0; i < maxIterations; i++) {
    const patches = computeDataFlowPatches(current, edges)
    if (patches.length === 0) {
      iterations = i
      break
    }
    current = current.map((node) => {
      const patch = patches.find((p) => p.nodeId === node.id)
      if (!patch) return node
      const hasChange = Object.entries(patch.data).some(([k, v]) => node.data[k] !== v)
      if (!hasChange) return node
      return { ...node, data: { ...node.data, ...patch.data } }
    })
    iterations = i + 1
  }

  return { nodes: current, iterations }
}
