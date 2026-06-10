import type { Connection, Edge } from '@xyflow/react'
import { generateNodeId } from './id'
import type { EdgeCompatStatus } from '../types/capability'

/** 画布连线统一使用贝塞尔曲线 */
export const CANVAS_EDGE_TYPE = 'default' as const

export const CANVAS_EDGE_STYLE = {
  stroke: 'var(--token-canvas-accent)',
  strokeWidth: 2,
} as const

export const CANVAS_EDGE_STYLE_WARN = {
  stroke: 'var(--token-warning, #d4a574)',
  strokeWidth: 2,
  strokeDasharray: '6 4',
} as const

export function edgeStyleForCompat(status: EdgeCompatStatus) {
  return status === 'dashed_warn' ? { ...CANVAS_EDGE_STYLE_WARN } : { ...CANVAS_EDGE_STYLE }
}

/** 供 addEdge 使用：勿写入 id: undefined，否则 xyflow 不会自动生成 id */
export function connectionToEdgeParams(
  connection: Connection,
  compat?: { status: EdgeCompatStatus; reason?: string },
): Connection & {
  type: typeof CANVAS_EDGE_TYPE
  animated: boolean
  style: typeof CANVAS_EDGE_STYLE | typeof CANVAS_EDGE_STYLE_WARN
  data?: { compatStatus: EdgeCompatStatus; compatReason?: string }
} {
  const status = compat?.status ?? 'solid'
  return {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: CANVAS_EDGE_TYPE,
    animated: status === 'solid',
    style: edgeStyleForCompat(status),
    ...(compat
      ? { data: { compatStatus: status, compatReason: compat.reason } }
      : {}),
  }
}

export function createCanvasEdge(connection: Connection & { id?: string }): Edge {
  return {
    id: connection.id ?? generateNodeId('edge'),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: CANVAS_EDGE_TYPE,
    animated: true,
    style: { ...CANVAS_EDGE_STYLE },
  }
}

export function ensureEdgeIds(edges: Edge[]): Edge[] {
  return edges.map((edge) => (edge.id ? edge : { ...edge, id: generateNodeId('edge') }))
}

export function normalizeCanvasEdges(edges: Edge[]): Edge[] {
  return ensureEdgeIds(
    edges.map((edge) =>
      edge.type === 'smoothstep' || edge.type === 'step' || edge.type === 'straight'
        ? { ...edge, type: CANVAS_EDGE_TYPE }
        : edge,
    ),
  )
}
