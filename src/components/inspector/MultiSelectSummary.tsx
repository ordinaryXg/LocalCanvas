import { useMemo } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useDagRun } from '../../hooks/useDagRun'
import { TYPE_LABELS } from './constants'
import { InspectorField } from './InspectorField'
import { InspectorSection } from './InspectorSection'
import { InspectorActions } from './InspectorActions'

interface Props {
  nodeIds: string[]
}

export function MultiSelectSummary({ nodeIds }: Props) {
  const nodes = useCanvasStore((s) => s.nodes)
  const removeNodes = useCanvasStore((s) => s.removeNodes)
  const { startRun, isRunning } = useDagRun()

  const selectedNodes = useMemo(
    () => nodes.filter((n) => nodeIds.includes(n.id)),
    [nodes, nodeIds],
  )

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of selectedNodes) {
      const t = n.type ?? 'unknown'
      counts[t] = (counts[t] ?? 0) + 1
    }
    return counts
  }, [selectedNodes])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text-primary">多选</h3>
      <div className="space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5 text-xs">
        <InspectorField label="选中" value={`${nodeIds.length} 个节点`} />
      </div>
      {Object.keys(typeCounts).length > 0 && (
        <InspectorSection title="类型">
          <div className="space-y-1">
            {Object.entries(typeCounts).map(([t, count]) => (
              <InspectorField key={t} label={TYPE_LABELS[t] ?? t} value={count} />
            ))}
          </div>
        </InspectorSection>
      )}
      <InspectorActions
        label={isRunning ? '执行中…' : '整组执行'}
        onClick={() => void startRun(nodeIds)}
        disabled={isRunning}
      />
      <button
        type="button"
        onClick={() => removeNodes(nodeIds)}
        className="w-full py-1.5 rounded-lg border border-danger/40 text-danger text-xs hover:bg-danger/10"
      >
        删除选中
      </button>
    </div>
  )
}
