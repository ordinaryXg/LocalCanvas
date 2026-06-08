import { GENERATABLE_NODE_TYPES } from '../constants/editorFeatures'

export type WorkbenchKind = 'compose' | 'generate'

export interface WorkbenchTarget {
  kind: WorkbenchKind
  nodeId: string
  nodeType?: string
  /** 非当前选中、由回落逻辑选中 */
  fallback?: boolean
}

interface NodeRef {
  id: string
  type?: string
}

export function resolveWorkbenchTarget(
  nodes: NodeRef[],
  selectedNodeIds: string[],
  activeComposeId?: string | null,
): WorkbenchTarget | null {
  const selectedCompose = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && n.type === 'compose',
  )
  if (selectedCompose) {
    return { kind: 'compose', nodeId: selectedCompose.id, nodeType: 'compose' }
  }

  const selectedGeneratable = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && GENERATABLE_NODE_TYPES.has(n.type ?? ''),
  )
  if (selectedGeneratable) {
    return {
      kind: 'generate',
      nodeId: selectedGeneratable.id,
      nodeType: selectedGeneratable.type,
    }
  }

  if (activeComposeId && nodes.some((n) => n.id === activeComposeId && n.type === 'compose')) {
    return { kind: 'compose', nodeId: activeComposeId, nodeType: 'compose', fallback: true }
  }

  const firstGeneratable = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && GENERATABLE_NODE_TYPES.has(n.type ?? ''),
  )
  if (firstGeneratable) {
    return {
      kind: 'generate',
      nodeId: firstGeneratable.id,
      nodeType: firstGeneratable.type,
    }
  }

  return null
}
