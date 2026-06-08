import { useT } from '../../i18n'
import { useCanvasStore } from '../../stores/canvasStore'
import type { DagRunState } from '../../types/dag'
import { NODE_TYPE_META } from '../../types/node'

interface DagRunPanelProps {
  runState: DagRunState | null
  onClose: () => void
  onRetry?: (nodeId: string) => void
  onSkip?: (nodeId: string) => void
}

const statusColor: Record<string, string> = {
  pending: 'text-text-muted',
  running: 'text-[var(--status-running)]',
  completed: 'text-[var(--status-success)]',
  failed: 'text-[var(--status-error)]',
  skipped: 'text-text-muted',
}

export function DagRunPanel({ runState, onClose, onRetry, onSkip }: DagRunPanelProps) {
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
          <div key={ns.nodeId} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-text-primary min-w-0 truncate">
              {typeLabel(ns.nodeId)} <span className="text-text-muted">({ns.nodeId.slice(0, 8)})</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {ns.status === 'failed' && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(ns.nodeId)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-[var(--studio-accent)]"
                >
                  重试
                </button>
              )}
              {ns.status === 'failed' && onSkip && (
                <button
                  type="button"
                  onClick={() => onSkip(ns.nodeId)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-[var(--studio-accent)]"
                >
                  跳过
                </button>
              )}
              <span className={statusColor[ns.status] ?? ''}>
                {t(`dag.status.${ns.status}`)}
                {ns.error ? ` — ${ns.error}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
