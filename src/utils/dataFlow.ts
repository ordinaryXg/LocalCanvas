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
  // firstFrame / lastFrame 源端口仍输出主图资源
  return {
    src: data.imageSrc as string | undefined,
    assetPath: data.imageAssetPath as string | undefined,
  }
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

  for (const edge of edges) {
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
          ...(out.assetPath ? { referenceAssetPath: out.assetPath } : {}),
        })
      }
    }

    if (sourceNode.type === 'image' && targetNode.type === 'video') {
      const out = imageOutputForHandle(sourceNode, sourceHandle)
      if (targetHandle === 'firstFrame') {
        if (!valuesEqual(targetData.firstFrameSrc, out.src)) {
          mergePatch(targetNode.id, {
            firstFrameSrc: out.src,
            ...(out.assetPath ? { firstFrameAssetPath: out.assetPath } : {}),
          })
        }
      }
      if (targetHandle === 'lastFrame') {
        if (!valuesEqual(targetData.lastFrameSrc, out.src)) {
          mergePatch(targetNode.id, {
            lastFrameSrc: out.src,
            ...(out.assetPath ? { lastFrameAssetPath: out.assetPath } : {}),
          })
        }
      }
    }

    if (sourceNode.type === 'audio' && targetNode.type === 'video' && targetHandle === 'audio') {
      const audioSrc = sourceNode.data.audioSrc
      const audioAssetPath = sourceNode.data.audioAssetPath
      if (!valuesEqual(targetData.audioSrc, audioSrc)) {
        mergePatch(targetNode.id, {
          audioSrc,
          ...(audioAssetPath ? { audioAssetPath } : {}),
        })
      }
    }
  }

  for (const [nodeId, data] of patchMap) {
    patches.push({ nodeId, data })
  }
  return patches
}
