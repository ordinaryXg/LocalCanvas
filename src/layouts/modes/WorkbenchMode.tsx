import { useEditorShellStore } from '../../stores/editorShellStore'
import { GeneratorContent } from '../../components/panels/GeneratorContent'
import { WorkbenchNodePreview } from '../../components/panels/WorkbenchNodePreview'
import { HistoryPanel } from '../../components/sidebar/HistoryPanel'
import { ComposeEditor } from '../../components/compose/ComposeEditor'
import { useWorkbenchTarget } from '../../hooks/useWorkbenchTarget'

export function WorkbenchMode() {
  const setMode = useEditorShellStore((s) => s.setMode)
  const target = useWorkbenchTarget()

  if (!target) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <p className="text-sm text-text-muted max-w-md leading-relaxed">
          工作台根据当前选中节点自动切换：
          <br />
          <span className="text-text-secondary">可生成节点</span> → 生成编辑；
          <span className="text-text-secondary"> 合成节点</span> → 剪辑台。
        </p>
        <button
          type="button"
          className="text-sm text-[var(--studio-accent)] hover:underline"
          onClick={() => setMode('canvas')}
        >
          返回画布
        </button>
      </div>
    )
  }

  if (target.kind === 'compose') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--studio-border)] bg-bg-secondary">
          <span className="text-sm text-text-primary">
            剪辑台
            {target.fallback && (
              <span className="ml-2 text-[10px] text-text-muted">（已回落到合成节点）</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setMode('canvas')}
            className="text-xs text-[var(--studio-accent)] hover:underline"
          >
            返回画布
          </button>
        </div>
        <div className="flex-1 min-h-0 relative">
          <ComposeEditor nodeId={target.nodeId} embedded />
        </div>
      </div>
    )
  }

  const nodeType = target.nodeType ?? 'text'

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-secondary">
      <div className="shrink-0 px-4 py-2 border-b border-[var(--studio-border)] text-sm text-text-primary">
        生成编辑
        {target.fallback && (
          <span className="ml-2 text-[10px] text-text-muted">（已回落到可编辑节点）</span>
        )}
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="w-80 shrink-0 border-r border-[var(--studio-border)] bg-bg-primary min-h-0 flex flex-col">
          <WorkbenchNodePreview nodeId={target.nodeId} nodeType={nodeType} />
        </aside>
        <div
          className={`flex-1 min-w-0 min-h-0 ${
            nodeType === 'storyboard' ? 'overflow-hidden p-3' : 'overflow-y-auto lc-scroll p-4'
          }`}
        >
          <div
            className={`w-full mx-auto min-h-0 ${
              nodeType === 'storyboard' ? 'h-full max-w-none' : 'max-w-5xl'
            }`}
          >
            <GeneratorContent nodeId={target.nodeId} nodeType={nodeType} embedded hidePreview />
          </div>
        </div>
        <aside className="w-64 shrink-0 border-l border-[var(--studio-border)] overflow-y-auto lc-scroll">
          <HistoryPanel />
        </aside>
      </div>
    </div>
  )
}
