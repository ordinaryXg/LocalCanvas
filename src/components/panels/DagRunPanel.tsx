import { useT } from '../../i18n'
import { useCanvasStore } from '../../stores/canvasStore'
import type { DagRunState } from '../../types/dag'
import { NODE_TYPE_META } from '../../types/node'

interface DagRunPanelProps {
  runState: DagRunState | null
  onClose: () => void
}

const statusColor: Record<string, string> = {
  pending: 'text-text-muted',
  running: 'text-yellow-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-text-muted',
}

export function DagRunPanel({ runState, onClose }: DagRunPanelProps) {
  const t = useT()
  const nodes = useCanvasStore((s) => s.nodes)

  if (!runState) return null

  const typeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    const meta = NODE_TYPE_META.find((m) => m.type === node?.type)
    return meta?.label ?? node?.type ?? nodeId
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-bg-secondary border-t border-border shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="text-sm text-text-primary font-medium">
          {t('dag.title')} — {runState.completedCount}/{runState.totalCount}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${statusColor[runState.status] ?? ''}`}>{runState.status}</span>
          {runState.status !== 'running' && (
            <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">
              {t('dag.close')}
            </button>
          )}
        </div>
      </div>
      <div className="max-h-32 overflow-y-auto px-4 py-2 space-y-1">
        {runState.nodeStates.map((ns) => (
          <div key={ns.nodeId} className="flex items-center justify-between text-xs">
            <span className="text-text-primary">
              {typeLabel(ns.nodeId)} <span className="text-text-muted">({ns.nodeId.slice(0, 8)})</span>
            </span>
            <span className={statusColor[ns.status] ?? ''}>
              {t(`dag.status.${ns.status}`)}
              {ns.error ? ` — ${ns.error}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
