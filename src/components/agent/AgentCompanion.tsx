import { AgentPanel } from '../panels/AgentPanel'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useAgentStore } from '../../stores/agentStore'

/** 浮岛宽度：原 480px 再横向放大 60% → 768px */
const FLOAT_WIDTH_CLASS = 'w-[768px] max-w-[calc(100%-2rem)]'
/** 高度占画布区域比例，避免 bottom 定位时被挤出视口 */
const FLOAT_HEIGHT_CLASS = 'h-[min(520px,calc(100%-2rem))] max-h-[min(520px,calc(100%-2rem))]'

export function AgentCompanion() {
  const agentExpanded = useEditorShellStore((s) => s.agentExpanded)
  const agentPinned = useEditorShellStore((s) => s.agentPinned)
  const setAgentExpanded = useEditorShellStore((s) => s.setAgentExpanded)
  const setAgentPinned = useEditorShellStore((s) => s.setAgentPinned)
  const messages = useAgentStore((s) => s.messages)
  const pendingPlan = useAgentStore((s) => s.pendingPlan)
  const pendingPatch = useAgentStore((s) => s.pendingPatch)
  const hasUnread = messages.length > 0 || pendingPlan !== null || pendingPatch !== null

  if (agentPinned) {
    return (
      <aside className="shrink-0 w-80 border-l border-[var(--studio-border)] bg-bg-secondary flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <span className="text-xs font-medium">Agent</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-text-muted hover:text-white"
              onClick={() => setAgentPinned(false)}
            >
              取消钉住
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentPanel />
        </div>
      </aside>
    )
  }

  return (
    <>
      {agentExpanded && (
        <div
          className={`absolute z-[70] bottom-4 left-1/2 -translate-x-1/2 ${FLOAT_WIDTH_CLASS} ${FLOAT_HEIGHT_CLASS} rounded-xl border border-[var(--studio-border)] bg-bg-secondary/95 backdrop-blur shadow-xl flex flex-col overflow-hidden pointer-events-auto`}
          role="dialog"
          aria-label="Agent 对话"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-xs font-medium">Agent</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-text-muted hover:text-white"
                onClick={() => setAgentPinned(true)}
              >
                钉住
              </button>
              <button
                type="button"
                className="text-xs text-text-muted hover:text-white"
                onClick={() => setAgentExpanded(false)}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AgentPanel />
          </div>
        </div>
      )}
      {!agentExpanded && (
        <button
          type="button"
          onClick={() => setAgentExpanded(true)}
          className={`absolute z-[70] bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full shadow-lg border border-[var(--studio-border)] bg-[var(--studio-surface)] flex items-center justify-center text-xl hover:bg-[var(--studio-surface-hover)] transition pointer-events-auto ${
            hasUnread ? 'ring-2 ring-[var(--studio-accent)]' : ''
          }`}
          title="Agent"
          aria-label="打开 Agent"
        >
          🤖
        </button>
      )}
    </>
  )
}
