import type { Node, Edge } from '@xyflow/react'
import type { ScriptRow } from '../types/node'

export interface DataFlowPatch {
  nodeId: string
  data: Record<string, unknown>
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return (a ?? '') === (b ?? '')
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
        const content = sourceNode.data.content
        if (!valuesEqual(targetData.prompt, content)) {
          mergePatch(targetNode.id, { prompt: content ?? '' })
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
      if (targetHandle === 'firstFrame') {
        if (
          !valuesEqual(targetData.firstFrameSrc, out.src) ||
          !valuesEqual(targetData.firstFrameAssetPath, out.assetPath)
        ) {
          mergePatch(targetNode.id, {
            firstFrameSrc: out.src,
            firstFrameAssetPath: out.assetPath,
          })
        }
      }
      if (targetHandle === 'lastFrame') {
        if (
          !valuesEqual(targetData.lastFrameSrc, out.src) ||
          !valuesEqual(targetData.lastFrameAssetPath, out.assetPath)
        ) {
          mergePatch(targetNode.id, {
            lastFrameSrc: out.src,
            lastFrameAssetPath: out.assetPath,
          })
        }
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
