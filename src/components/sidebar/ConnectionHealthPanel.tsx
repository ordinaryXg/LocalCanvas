import { useMemo, useCallback } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { edgeHealthLabel, listWarnEdges } from '../../utils/connectionHealth'
import { showToast } from '../../utils/ErrorHandler'

export function ConnectionHealthPanel() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const removeEdges = useCanvasStore((s) => s.removeEdges)
  const selectAndFocusNode = useCanvasStore((s) => s.selectAndFocusNode)

  const warnEdges = useMemo(() => listWarnEdges(edges), [edges])

  const disconnectAll = useCallback(() => {
    if (warnEdges.length === 0) return
    removeEdges(warnEdges.map((e) => e.id))
    showToast(`已断开 ${warnEdges.length} 条能力警告连线`, 'info')
  }, [warnEdges, removeEdges])

  if (warnEdges.length === 0) {
    return (
      <div className="p-4 text-xs text-text-muted text-center">
        暂无能力警告连线（虚线边）
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--status-error)]">
          {warnEdges.length} 条连线存在能力警告
        </p>
        <button
          type="button"
          onClick={disconnectAll}
          className="shrink-0 text-[10px] px-2 py-1 rounded border border-[var(--status-error)]/40 text-[var(--status-error)] hover:bg-[var(--status-error)]/10"
        >
          全部断开
        </button>
      </div>
      <ul className="space-y-2">
        {warnEdges.map((edge) => (
          <li
            key={edge.id}
            className="rounded border border-border/60 bg-bg-tertiary/40 px-2 py-2 text-[10px]"
          >
            <p className="text-text-primary leading-snug">{edgeHealthLabel(edge, nodes)}</p>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                className="text-[var(--studio-accent)] hover:underline"
                onClick={() => selectAndFocusNode(edge.source)}
              >
                跳转源
              </button>
              <button
                type="button"
                className="text-[var(--studio-accent)] hover:underline"
                onClick={() => selectAndFocusNode(edge.target)}
              >
                跳转目标
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
