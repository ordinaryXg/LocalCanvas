import { v4 as uuid } from 'uuid'
import type { Node, Edge } from '@xyflow/react'
import type { ResonanceField } from '../../../../src/types/fluid'
import { compilePrompt } from './compile-prompt'
import { FLUID_INTENT_NODE_PREFIX, shotSlotIdForNode } from '../../../../src/types/fluid'

export type CompileScope = 'resonance' | 'affect' | 'chorus'

export interface CompileDownResult {
  nodes: Node[]
  edges: Edge[]
  changedNodeIds: string[]
}

export interface ProjectUpResult {
  bindings: Array<{
    shotSlotId: string
    nodeId: string
    nodeType: 'video' | 'storyboardCell'
    cellIndex?: number
  }>
  conflict: boolean
  compiledPrompt: string
  nodePromptHash?: string
}

export function intentNodeId(projectId: string): string {
  return `${FLUID_INTENT_NODE_PREFIX}${projectId}`
}

function upsertIntentNode(nodes: Node[], projectId: string, draft: string): { nodes: Node[]; id: string } {
  const id = intentNodeId(projectId)
  const existing = nodes.find((n) => n.id === id)
  if (existing) {
    return {
      nodes: nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, draft, title: '〔意图编译器〕', outputMode: 'passthrough' } }
          : n,
      ),
      id,
    }
  }
  const node: Node = {
    id,
    type: 'text',
    position: { x: -9999, y: -9999 },
    data: { draft, title: '〔意图编译器〕', outputMode: 'passthrough' },
    deletable: false,
    selectable: true,
  }
  return { nodes: [...nodes, node], id }
}

export function compileDownResonance(
  field: ResonanceField,
  nodes: Node[],
  edges: Edge[],
): CompileDownResult {
  const { prompt } = compilePrompt('', field)
  const { nodes: n2, id } = upsertIntentNode(nodes, field.projectId, prompt)
  return { nodes: n2, edges, changedNodeIds: [id] }
}

export function projectUp(
  projectId: string,
  nodes: Node[],
  compiledPrompt: string,
): ProjectUpResult {
  const bindings: ProjectUpResult['bindings'] = []
  for (const n of nodes) {
    if (n.type === 'video') {
      bindings.push({
        shotSlotId: shotSlotIdForNode(n.id),
        nodeId: n.id,
        nodeType: 'video',
      })
    }
    if (n.type === 'storyboard') {
      const cells = (n.data as { cells?: unknown[] })?.cells ?? []
      cells.forEach((_, idx) => {
        bindings.push({
          shotSlotId: shotSlotIdForNode(n.id, idx),
          nodeId: n.id,
          nodeType: 'storyboardCell',
          cellIndex: idx,
        })
      })
    }
  }
  const videoPrompts = nodes
    .filter((n) => n.type === 'video')
    .map((n) => String((n.data as { prompt?: string }).prompt ?? ''))
    .join('|')
  const conflict = videoPrompts.length > 0 && compiledPrompt.length > 0 && !videoPrompts.includes(compiledPrompt.slice(0, 40))
  return { bindings, conflict, compiledPrompt, nodePromptHash: videoPrompts }
}

export function hashResonance(field: ResonanceField): string {
  const raw = JSON.stringify(field.sources.map((s) => [s.id, s.gravity]))
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0
  return Math.abs(h).toString(16).slice(0, 16)
}
