import { useCanvasStore } from '../../stores/canvasStore'
import { GENERATABLE_NODE_TYPES } from '../../constants/editorFeatures'
import { GeneratorContent } from '../../components/panels/GeneratorContent'
import { HistoryPanel } from '../../components/sidebar/HistoryPanel'

export function GenerateMode() {
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)

  const selectedNode = nodes.find(
    (n) => selectedNodeIds.includes(n.id) && GENERATABLE_NODE_TYPES.has(n.type ?? ''),
  )

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-text-muted">
        请在画布模式选中一个可生成节点，或按 G 打开生成器
      </div>
    )
  }

  const type = selectedNode.type ?? 'text'

  return (
    <div className="flex h-full min-h-0 bg-bg-secondary">
      <div className="flex-1 min-w-0 overflow-y-auto lc-scroll p-4">
        <div className="w-full max-w-5xl mx-auto min-h-0">
          <GeneratorContent nodeId={selectedNode.id} nodeType={type} embedded />
        </div>
      </div>
      <aside className="w-64 shrink-0 border-l border-[var(--studio-border)] overflow-y-auto lc-scroll">
        <HistoryPanel />
      </aside>
    </div>
  )
}
