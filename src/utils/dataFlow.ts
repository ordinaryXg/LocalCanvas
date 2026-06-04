import type { Node, Edge } from '@xyflow/react'
import type { ScriptRow } from '../types/node'

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

/** 文本节点输出端口 prompt：优先生成结果，无有效生成内容时才回退到输入 */
export function textNodePromptOutput(data: Record<string, unknown>): string {
  const generated =
    (typeof data.generatedContent === 'string' ? data.generatedContent : undefined) ??
    (typeof data.content === 'string' ? data.content : undefined)
  if (generated?.trim()) return generated

  const input = typeof data.inputContent === 'string' ? data.inputContent : undefined
  return input ?? ''
}

function imageOutputForHandle(
  source: Node,
  sourceHandle: string | null | undefined,
): { src?: string; assetPath?: string } {
  const data = source.data as Record<string, unknown>
  if (sourceHandle === 'reference') {
    return {
      src: (data.referenceSrc ?? data.imageSrc) as string | undefined,
      assetPath: (data.referenceAssetPath ?? data.imageAssetPath) as string | undefined,
    }
  }
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
  if (source.type === 'image' && target.type === 'image' && targetHandle === 'reference') {
    return true
  }
  if (source.type === 'image' && target.type === 'video') {
    return targetHandle === 'firstFrame' || targetHandle === 'lastFrame'
  }
  if (source.type === 'audio' && target.type === 'video' && targetHandle === 'audio') {
    return true
  }
  if (source.type === 'video' && target.type === 'compose') {
    return targetHandle === 'video1' || targetHandle === 'video2' || targetHandle === 'video3'
  }
  if (source.type === 'video' && target.type === 'video' && targetHandle === 'video') {
    return true
  }
  if (source.type === 'compose' && target.type === 'video' && targetHandle === 'video') {
    return sourceHandle === 'composed'
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
        const content = textNodePromptOutput(sourceNode.data as Record<string, unknown>)
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

    if (sourceNode.type === 'image' && targetNode.type === 'image' && targetHandle === 'reference') {
      const out = imageOutputForHandle(sourceNode, sourceHandle)
      if (out.src && !valuesEqual(targetData.referenceSrc, out.src)) {
        mergePatch(targetNode.id, {
          referenceSrc: out.src,
          referenceAssetPath: out.assetPath,
        })
      }
    }

    if (sourceNode.type === 'image' && targetNode.type === 'video') {
      const out = imageOutputForHandle(sourceNode, sourceHandle)
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

    if (sourceNode.type === 'video' && targetNode.type === 'compose') {
      const handle = targetHandle as 'video1' | 'video2' | 'video3'
      const slotIndex = handle === 'video1' ? 0 : handle === 'video2' ? 1 : 2
      const existingClips = ((targetData.clips as Array<Record<string, unknown>>) ?? []).slice()
      const clipId = `${edge.source}-${handle}`
      const newClip = {
        id: clipId,
        name: (sourceNode.data.fileName as string) || `视频${slotIndex + 1}`,
        assetPath: sourceNode.data.videoAssetPath as string | undefined,
        duration: (sourceNode.data.duration as number) || 5,
        startTime: slotIndex * ((sourceNode.data.duration as number) || 5),
      }

      while (existingClips.length <= slotIndex) {
        existingClips.push({ id: `empty-${existingClips.length}`, duration: 0 })
      }
      existingClips[slotIndex] = newClip

      const filtered = existingClips.filter((c) => (c.duration as number) > 0)
      const clipsJson = JSON.stringify(filtered)
      const currentJson = JSON.stringify((targetData.clips as unknown[]) ?? [])
      if (clipsJson !== currentJson) {
        mergePatch(targetNode.id, { clips: filtered })
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

    if (node.type === 'image' && !hasIncoming(node.id, 'reference')) {
      if (data.referenceSrc || data.referenceAssetPath) {
        mergePatch(node.id, { referenceSrc: undefined, referenceAssetPath: undefined })
      }
    }

    if (node.type === 'compose') {
      const slots = ['video1', 'video2', 'video3'] as const
      const rebuiltClips: Array<Record<string, unknown>> = []
      for (const handle of slots) {
        const edge = activeEdges.find((e) => e.target === node.id && e.targetHandle === handle)
        if (!edge) continue
        const source = nodes.find((n) => n.id === edge.source)
        if (!source || source.type !== 'video') continue
        const slotIndex = handle === 'video1' ? 0 : handle === 'video2' ? 1 : 2
        rebuiltClips.push({
          id: `${edge.source}-${handle}`,
          name: (source.data.fileName as string) || `视频${slotIndex + 1}`,
          assetPath: source.data.videoAssetPath as string | undefined,
          duration: (source.data.duration as number) || 5,
          startTime: slotIndex * ((source.data.duration as number) || 5),
        })
      }
      const currentJson = JSON.stringify((data.clips as unknown[]) ?? [])
      const nextJson = JSON.stringify(rebuiltClips)
      if (currentJson !== nextJson) {
        mergePatch(node.id, { clips: rebuiltClips })
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
