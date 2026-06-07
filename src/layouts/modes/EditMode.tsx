import { useCanvasStore } from '../../stores/canvasStore'
import { useComposeEditorStore } from '../../stores/composeEditorStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { ComposeEditor } from '../../components/compose/ComposeEditor'

export function EditMode() {
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const activeNodeId = useComposeEditorStore((s) => s.activeNodeId)
  const setMode = useEditorShellStore((s) => s.setMode)
  const setInspectorCollapsed = useEditorShellStore((s) => s.setInspectorCollapsed)

  const composeId =
    activeNodeId ??
    nodes.find((n) => selectedNodeIds.includes(n.id) && n.type === 'compose')?.id ??
    nodes.find((n) => n.type === 'compose')?.id

  if (!composeId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-text-muted">
        <p>请先选中一个合成节点</p>
        <button
          type="button"
          className="text-[var(--studio-accent)] hover:underline"
          onClick={() => {
            setMode('canvas')
            setInspectorCollapsed(false)
          }}
        >
          返回画布
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--studio-border)] bg-bg-secondary">
        <span className="text-sm text-text-primary">剪辑台</span>
        <button
          type="button"
          onClick={() => {
            setMode('canvas')
            setInspectorCollapsed(false)
          }}
          className="text-xs text-[var(--studio-accent)] hover:underline"
        >
          返回画布
        </button>
      </div>
      <div className="flex-1 min-h-0 relative">
        <ComposeEditor nodeId={composeId} />
      </div>
    </div>
  )
}
