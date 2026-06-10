import type { Edge, Node } from '@xyflow/react'
import { getPortHint } from '../nodes/portMeta'
import { NODE_TYPE_COLORS, TYPE_LABELS } from './constants'
import { InspectorSection } from './InspectorSection'
import { nodeDisplayTitle } from '../../utils/nodeNaming'
import { useNavigateToNode } from './useNavigateToNode'

function ConnectionTags({
  edges,
  nodes,
  nodeId,
  direction,
}: {
  edges: Edge[]
  nodes: Node[]
  nodeId: string
  direction: 'in' | 'out'
}) {
  const navigateToNode = useNavigateToNode()

  const list =
    direction === 'in'
      ? edges.filter((e) => e.target === nodeId)
      : edges.filter((e) => e.source === nodeId)

  if (list.length === 0) {
    return <p className="text-[10px] text-text-muted italic">无</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((edge) => {
        const peerId = direction === 'in' ? edge.source : edge.target
        const peer = nodes.find((n) => n.id === peerId)
        const handle = direction === 'in' ? edge.targetHandle : edge.sourceHandle
        const handleType = direction === 'in' ? 'target' : 'source'
        const hint = handle ? getPortHint(handle, handleType) : ''
        const peerType = peer?.type ?? ''
        const peerTitle = peer
          ? nodeDisplayTitle(peer, TYPE_LABELS[peerType] ?? peerType)
          : peerId.slice(0, 8)
        const typeColor = NODE_TYPE_COLORS[peerType] ?? 'var(--token-canvas-accent)'

        return (
          <button
            key={edge.id}
            type="button"
            onClick={() => navigateToNode(peerId)}
            title={hint ? `${peerTitle} · ${hint}` : peerTitle}
            className="inline-flex items-center gap-1 max-w-full text-[10px] rounded-full border border-border/70 bg-bg-tertiary/40 px-2 py-0.5 text-text-primary hover:border-[var(--studio-accent)] hover:bg-[var(--studio-accent-muted)]/20 transition-colors"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: typeColor }}
              aria-hidden
            />
            <span className="truncate">{peerTitle}</span>
            {hint && <span className="text-text-muted shrink-0">· {hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  nodeId: string
  nodes: Node[]
  edges: Edge[]
}

export function InspectorConnections({ nodeId, nodes, edges }: Props) {
  return (
    <InspectorSection title="连线">
      <p className="text-[10px] text-text-muted mb-1">输入</p>
      <ConnectionTags edges={edges} nodes={nodes} nodeId={nodeId} direction="in" />
      <p className="text-[10px] text-text-muted mb-1 mt-2">输出</p>
      <ConnectionTags edges={edges} nodes={nodes} nodeId={nodeId} direction="out" />
    </InspectorSection>
  )
}
