import type { Node } from '@xyflow/react'
import type { ScriptRow } from '../types/node'
import { generateNodeId } from './id'
import { scriptRowsToFrames } from './storyboardConvert'

export function createStoryboardFromScriptNode(
  scriptNode: Node,
  allNodes: Node[],
): Node | null {
  if (scriptNode.type !== 'script') return null
  const data = scriptNode.data as Record<string, unknown>
  const rows = (data.scriptRows as ScriptRow[]) ?? []
  if (rows.length === 0) return null

  const rowAssets = data.rowAssets as
    | Record<number, { imageNodeId?: string; videoNodeId?: string }>
    | undefined
  const nodesData: Record<string, Record<string, unknown>> = {}
  for (const n of allNodes) {
    nodesData[n.id] = n.data as Record<string, unknown>
  }

  const frames = scriptRowsToFrames(rows, rowAssets, nodesData)
  return {
    id: generateNodeId('storyboard'),
    type: 'storyboard',
    position: { x: scriptNode.position.x + 420, y: scriptNode.position.y },
    data: {
      frames,
      layout: 'list',
      imageModelId: data.imageModelId,
      videoModelId: data.videoModelId,
    },
    selected: true,
  }
}
