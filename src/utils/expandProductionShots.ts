import type { ProductionPlan, ShotSpec } from '../types/agent'
import type { GraphPatch, PlannedEdge, PlannedNode } from '../types/agent'
import { MAX_EXPAND_SHOTS } from './expandProductionShotsConstants'
import { validateRefSheetShots } from './refSheetValidation'
import { isSceneBoundaryShot } from './sceneCheckpoints'

export { MAX_EXPAND_SHOTS } from './expandProductionShotsConstants'

const ROW_HEIGHT = 240
const COL_WIDTH = 380

export interface ExpandProductionShotsParams {
  plan: ProductionPlan
  anchorNodeIds: string[]
  maxShots?: number
  referenceImageNodeId?: string
  defaultImageModel?: string
  defaultVideoModel?: string
}

export interface ExpandProductionShotsResult {
  patch: GraphPatch
  warnings: string[]
  expandedCount: number
}

function shotChainNodes(
  shot: ShotSpec,
  index: number,
  baseX: number,
  baseY: number,
  aspectRatio: string,
  defaultImageModel?: string,
  defaultVideoModel?: string,
  sceneBoundaryEnd?: boolean,
): { nodes: PlannedNode[]; edges: PlannedEdge[]; entryTempId: string } {
  const prefix = `shot-${shot.sequence}`
  const y = baseY + index * ROW_HEIGHT
  const textTemp = `${prefix}-text`
  const imageTemp = `${prefix}-image`
  const videoTemp = `${prefix}-video`
  const prompt = shot.prompt

  const nodes: PlannedNode[] = [
    {
      tempId: textTemp,
      type: 'text',
      label: `镜 ${shot.sequence} 描述`,
      position: { x: baseX, y },
      data: {
        draft: prompt,
        output: prompt,
        outputMode: 'passthrough',
        modelId: '',
      },
    },
    {
      tempId: imageTemp,
      type: 'image',
      label: `镜 ${shot.sequence} 图`,
      position: { x: baseX + COL_WIDTH, y },
      data: { ratio: aspectRatio, modelId: defaultImageModel ?? '' },
      modelHint: defaultImageModel,
    },
    {
      tempId: videoTemp,
      type: 'video',
      label: `镜 ${shot.sequence} 视频`,
      position: { x: baseX + COL_WIDTH * 2, y },
      data: {
        ratio: aspectRatio,
        duration: shot.durationSec,
        modelId: defaultVideoModel ?? '',
        shotSequence: shot.sequence,
        sceneId: shot.sceneId,
        sceneBoundaryEnd: sceneBoundaryEnd ?? false,
      },
      modelHint: defaultVideoModel,
    },
  ]

  const edges: PlannedEdge[] = [
    { source: textTemp, sourceHandle: 'prompt', target: imageTemp, targetHandle: 'prompt' },
    { source: imageTemp, sourceHandle: 'image', target: videoTemp, targetHandle: 'firstFrame' },
    { source: textTemp, sourceHandle: 'prompt', target: videoTemp, targetHandle: 'prompt' },
  ]

  if (shot.productionMode === 'ref-sheet') {
    edges.push({
      source: '__ref-image__',
      sourceHandle: 'image',
      target: videoTemp,
      targetHandle: 'reference1',
    })
  }

  return { nodes, edges, entryTempId: videoTemp }
}

export function buildExpandProductionShotsPatch(
  params: ExpandProductionShotsParams,
): ExpandProductionShotsResult {
  const maxShots = Math.min(MAX_EXPAND_SHOTS, params.maxShots ?? MAX_EXPAND_SHOTS)
  const shots = [...params.plan.shots]
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, maxShots)

  const warnings = validateRefSheetShots(shots, !!params.referenceImageNodeId)
  const aspectRatio = params.plan.brief.aspectRatio || '16:9'
  const baseX = 120
  const baseY = 120

  const addNodes: PlannedNode[] = []
  const addEdges: PlannedEdge[] = []

  for (const [index, shot] of shots.entries()) {
    const chain = shotChainNodes(
      shot,
      index,
      baseX,
      baseY,
      aspectRatio,
      params.defaultImageModel,
      params.defaultVideoModel,
      isSceneBoundaryShot(shot, params.plan.shots),
    )
    addNodes.push(...chain.nodes)
    for (const edge of chain.edges) {
      if (edge.source === '__ref-image__') {
        if (!params.referenceImageNodeId) continue
        addEdges.push({ ...edge, source: params.referenceImageNodeId })
      } else {
        addEdges.push(edge)
      }
    }
  }

  const patch: GraphPatch = {
    version: 1,
    intent: params.plan.intent,
    summary: `展开前 ${shots.length} 镜：text → image → video 子图`,
    anchorNodeIds: params.anchorNodeIds,
    addNodes,
    addEdges,
    executionMode: 'checkpoint',
  }

  if (
    params.referenceImageNodeId &&
    !patch.anchorNodeIds.includes(params.referenceImageNodeId)
  ) {
    patch.anchorNodeIds = [...patch.anchorNodeIds, params.referenceImageNodeId]
  }

  return { patch, warnings, expandedCount: shots.length }
}
