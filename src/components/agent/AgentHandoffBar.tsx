import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useAgentStore } from '../../stores/agentStore'
import { createStoryboardFromScriptNode } from '../../utils/scriptToStoryboardNode'
import { useT } from '../../i18n'
import type { AgentHandoffContext } from '../../types/agent'

interface AgentHandoffBarProps {
  handoff: AgentHandoffContext
}

export function AgentHandoffBar({ handoff }: AgentHandoffBarProps) {
  const t = useT()
  const nodes = useCanvasStore((s) => s.nodes)
  const addNode = useCanvasStore((s) => s.addNode)
  const selectAndFocusNode = useCanvasStore((s) => s.selectAndFocusNode)
  const toggleDrawer = useEditorShellStore((s) => s.toggleDrawer)
  const openWorkbenchForCompose = useEditorShellStore((s) => s.openWorkbenchForCompose)
  const setMode = useEditorShellStore((s) => s.setMode)
  const setAgentExpanded = useEditorShellStore((s) => s.setAgentExpanded)
  const setHandoffCollapsed = useAgentStore((s) => s.setHandoffCollapsed)
  const setAgentModeOverride = useAgentStore((s) => s.setAgentModeOverride)

  if (handoff.collapsed) {
    return (
      <button
        type="button"
        className="w-full text-left text-[10px] px-2 py-1.5 rounded border border-accent/30 text-accent hover:bg-accent/10"
        onClick={() => setHandoffCollapsed(false)}
      >
        {t('agent.handoffExpand')}
      </button>
    )
  }

  const goScript = () => {
    if (!handoff.scriptNodeId) return
    selectAndFocusNode(handoff.scriptNodeId)
    toggleDrawer('nodes')
    setMode('canvas')
  }

  const goStoryboard = () => {
    if (!handoff.scriptNodeId) return
    const scriptNode = nodes.find((n) => n.id === handoff.scriptNodeId)
    if (!scriptNode) return

    let storyboardId = handoff.storyboardNodeId
    const existing = storyboardId ? nodes.find((n) => n.id === storyboardId) : undefined
    if (!existing) {
      const created = createStoryboardFromScriptNode(scriptNode, nodes)
      if (!created) return
      addNode(created)
      storyboardId = created.id
    }

    if (storyboardId) {
      selectAndFocusNode(storyboardId)
      setMode('workbench')
    }
  }

  const goCompose = () => {
    if (!handoff.composeNodeId) return
    openWorkbenchForCompose(handoff.composeNodeId)
  }

  const continueInAgent = () => {
    setAgentModeOverride('build')
    setAgentExpanded(true)
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-bg-tertiary/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-primary">{t('agent.handoffTitle')}</span>
        <button
          type="button"
          className="text-[10px] text-text-muted hover:text-white"
          onClick={() => setHandoffCollapsed(true)}
        >
          {t('agent.handoffCollapse')}
        </button>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">① {t('agent.handoffScript')}</span>
          <button
            type="button"
            disabled={!handoff.scriptNodeId}
            onClick={goScript}
            className="px-2 py-0.5 rounded bg-accent/20 text-accent disabled:opacity-40"
          >
            {t('agent.handoffGo')}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">② {t('agent.handoffStoryboard')}</span>
          <button
            type="button"
            disabled={!handoff.scriptNodeId}
            onClick={goStoryboard}
            className="px-2 py-0.5 rounded bg-accent/20 text-accent disabled:opacity-40"
          >
            {t('agent.handoffGo')}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">③ {t('agent.handoffVideo')}</span>
          <span className="text-text-muted italic">{t('agent.handoffVideoHint')}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">④ {t('agent.handoffCompose')}</span>
          <button
            type="button"
            disabled={!handoff.composeNodeId}
            onClick={goCompose}
            className="px-2 py-0.5 rounded bg-accent/20 text-accent disabled:opacity-40"
          >
            {t('agent.handoffGo')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={continueInAgent}
        className="text-[10px] text-accent hover:underline"
      >
        {t('agent.handoffContinueAgent')}
      </button>
    </div>
  )
}
