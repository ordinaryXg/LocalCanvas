import type { CanvasNodeSnapshot, GraphPatch } from '../types/agent'

export interface RuleBasedGraphPatchRequest {
  message: string
  focusedNodeIds: string[]
  canvasNodes: CanvasNodeSnapshot[]
}

function parseDurationSec(intent: string): number {
  const match = intent.match(/(\d+(?:\.\d+)?)\s*秒/)
  if (!match) return 5
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? Math.min(value, 600) : 5
}

/** 规则化 Build 补丁：图像后接视频（首帧），用于 LLM 不可用或解析失败时的回退 */
export function tryBuildRuleBasedGraphPatch(request: RuleBasedGraphPatchRequest): GraphPatch | null {
  if (request.focusedNodeIds.length !== 1) return null

  const anchorId = request.focusedNodeIds[0]
  const anchor = request.canvasNodes.find((n) => n.id === anchorId)
  if (!anchor || anchor.type !== 'image') return null

  const intent = request.message.trim()
  const wantsVideo = /视频|video|成片|clip/i.test(intent)
  const afterAnchor = /后面|后接|接着|跟随|after|follow/i.test(intent)
  const usesFirstFrame = /首帧|first\s*frame|这张图|该图|此图|用这.*图/i.test(intent)
  if (!wantsVideo && !(afterAnchor && usesFirstFrame)) return null

  const durationSec = parseDurationSec(intent)
  const label = anchor.label ?? (anchor.data.label as string | undefined) ?? '成片'

  return {
    version: 1,
    intent,
    summary: `在图像「${label}」后添加 ${durationSec} 秒视频（首帧接图像输出）`,
    anchorNodeIds: [anchorId],
    addNodes: [
      {
        tempId: 'video-new',
        type: 'video',
        label: '成片',
        data: {
          duration: durationSec,
          prompt: intent,
        },
      },
    ],
    addEdges: [
      {
        source: anchorId,
        sourceHandle: 'image',
        target: 'video-new',
        targetHandle: 'firstFrame',
      },
    ],
    executionMode: 'none',
  }
}
