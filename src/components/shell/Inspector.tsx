import { useMemo } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { EdgeInspector } from '../inspector/EdgeInspector'
import { MultiSelectSummary } from '../inspector/MultiSelectSummary'
import { NodeInspector } from '../inspector/NodeInspector'
import { ProjectSummary } from '../inspector/ProjectSummary'

interface InspectorProps {
  overlay?: boolean
}

export function Inspector({ overlay = false }: InspectorProps) {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const inspectorCollapsed = useEditorShellStore((s) => s.inspectorCollapsed)
  const setInspectorCollapsed = useEditorShellStore((s) => s.setInspectorCollapsed)
  const inspectorWidth = useEditorShellStore((s) => s.inspectorWidth)
  const agentPinned = useEditorShellStore((s) => s.agentPinned)

  const selection = useMemo(() => {
    if (selectedNodeIds.length > 1) {
      return { kind: 'multi' as const, nodeIds: selectedNodeIds }
    }
    if (selectedNodeIds.length === 1) {
      const node = nodes.find((n) => n.id === selectedNodeIds[0])
      if (node) return { kind: 'node' as const, node }
    }
    const selectedEdges = edges.filter((e) => e.selected)
    if (selectedEdges.length === 1) {
      return { kind: 'edge' as const, edge: selectedEdges[0] }
    }
    return { kind: 'none' as const }
  }, [selectedNodeIds, nodes, edges])

  if (agentPinned) return null

  if (inspectorCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setInspectorCollapsed(false)}
        className={`shrink-0 w-8 border-l border-[var(--studio-border)] bg-bg-secondary text-text-muted hover:text-white text-xs ${
          overlay ? 'fixed right-0 top-[var(--space-topbar)] bottom-0 z-40' : ''
        }`}
        title="展开检查器"
      >
        ◀
      </button>
    )
  }

  const panel = (
    <aside
      className={`shrink-0 flex flex-col border-l border-[var(--studio-border)] bg-bg-secondary overflow-hidden ${
        overlay ? 'fixed right-0 top-[var(--space-topbar)] bottom-0 z-50 shadow-2xl dock-expand-enter' : ''
      }`}
      style={{ width: inspectorWidth }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-medium">检查器</span>
        <button type="button" onClick={() => setInspectorCollapsed(true)} className="text-xs text-text-muted">
          ▶
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto lc-scroll p-3">
        {selection.kind === 'node' && <NodeInspector node={selection.node} />}
        {selection.kind === 'multi' && <MultiSelectSummary nodeIds={selection.nodeIds} />}
        {selection.kind === 'edge' && <EdgeInspector edge={selection.edge} nodes={nodes} />}
        {selection.kind === 'none' && <ProjectSummary nodes={nodes} edges={edges} />}
      </div>
    </aside>
  )

  if (!overlay) return panel

  return (
    <>
      <button
        type="button"
        aria-label="关闭检查器"
        className="fixed inset-0 top-[var(--space-topbar)] z-40 bg-black/40"
        onClick={() => setInspectorCollapsed(true)}
      />
      {panel}
    </>
  )
}
