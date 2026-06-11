import { useAgentStore } from '../../stores/agentStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import type { MouseEvent } from 'react'
import { createStoryboardFromScriptNode } from '../../utils/scriptToStoryboardNode'
import { handleError, showToast } from '../../utils/ErrorHandler'
import { isValidProductionPlan } from '../../utils/buildProductionPlan'
import { isValidGraphPatch } from '../../utils/parseGraphPatch'
import { wireComposeToStoryboardSelectedTakes } from '../../utils/syncComposeFromStoryboard'
import { useT } from '../../i18n'
import type { AgentHandoffContext } from '../../types/agent'
import type { StoryboardFrame } from '../../types/storyboard'

interface AgentHandoffBarProps {
  handoff: AgentHandoffContext
}

export function AgentHandoffBar({ handoff }: AgentHandoffBarProps) {
  const t = useT()
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const addNode = useCanvasStore((s) => s.addNode)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const removeEdges = useCanvasStore((s) => s.removeEdges)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const selectAndFocusNode = useCanvasStore((s) => s.selectAndFocusNode)
  const toggleDrawer = useEditorShellStore((s) => s.toggleDrawer)
  const openWorkbenchForCompose = useEditorShellStore((s) => s.openWorkbenchForCompose)
  const setMode = useEditorShellStore((s) => s.setMode)
  const setAgentExpanded = useEditorShellStore((s) => s.setAgentExpanded)
  const setHandoffCollapsed = useAgentStore((s) => s.setHandoffCollapsed)
  const setAgentModeOverride = useAgentStore((s) => s.setAgentModeOverride)
  const setBuildFocusedNodeIds = useAgentStore((s) => s.setBuildFocusedNodeIds)
  const setHandoff = useAgentStore((s) => s.setHandoff)
  const lastAppliedProductionPlan = useAgentStore((s) => s.lastAppliedProductionPlan)
  const setPendingPatch = useAgentStore((s) => s.setPendingPatch)
  const buildFocusedNodeIds = useAgentStore((s) => s.buildFocusedNodeIds)

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
      if (storyboardId !== handoff.storyboardNodeId) {
        setHandoff({ ...handoff, storyboardNodeId: storyboardId })
      }
      selectAndFocusNode(storyboardId)
      setMode('workbench')
    }
  }

  const goCompose = () => {
    if (!handoff.composeNodeId) return
    wireComposeFromStoryboard()
    openWorkbenchForCompose(handoff.composeNodeId)
  }

  const wireComposeFromStoryboard = () => {
    if (!handoff.composeNodeId) return
    let storyboardId = handoff.storyboardNodeId
    if (!storyboardId && handoff.scriptNodeId) {
      const scriptNode = nodes.find((n) => n.id === handoff.scriptNodeId)
      if (scriptNode) {
        const created = createStoryboardFromScriptNode(scriptNode, nodes)
        if (created) {
          addNode(created)
          storyboardId = created.id
        }
      }
    }
    if (!storyboardId) {
      showToast(t('agent.wireComposeNeedStoryboard'), 'info')
      return
    }
    const storyboard = nodes.find((n) => n.id === storyboardId)
    if (!storyboard || storyboard.type !== 'storyboard') return
    const frames = (storyboard.data.frames as StoryboardFrame[]) ?? []
    const result = wireComposeToStoryboardSelectedTakes(
      frames,
      handoff.composeNodeId,
      nodes,
      edges,
    )
    if (result.edgeIdsToRemove.length > 0) removeEdges(result.edgeIdsToRemove)
    for (const edge of result.edgesToAdd) addConnection(edge)
    updateNodeData(handoff.composeNodeId, { clips: result.composeClips })
    if (result.wiredCount > 0) {
      showToast(t('agent.wireComposeDone').replace('{{n}}', String(result.wiredCount)), 'info')
    } else {
      showToast(t('agent.wireComposeEmpty'), 'info')
    }
  }

  const continueInAgent = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setMode('canvas')
    setAgentModeOverride('build')
    const focusId =
      handoff.storyboardNodeId ??
      handoff.scriptNodeId ??
      handoff.composeNodeId
    if (focusId) {
      setBuildFocusedNodeIds([focusId])
      selectAndFocusNode(focusId)
    }
    setAgentExpanded(true)
    setHandoffCollapsed(false)
    showToast(t('agent.handoffContinueBuildHint'), 'info')
  }

  const expandShots = async () => {
    if (!isValidProductionPlan(lastAppliedProductionPlan)) {
      showToast(t('agent.expandShotsNeedPlan'), 'info')
      return
    }
    const anchorId = handoff.storyboardNodeId ?? handoff.scriptNodeId
    if (!anchorId) return

    const refImageId =
      buildFocusedNodeIds
        .map((id) => nodes.find((n) => n.id === id))
        .find((n) => n?.type === 'image')?.id ??
      nodes.find((n) => n.type === 'image')?.id

    try {
      const result = await window.api.agent.expandShots({
        productionPlan: lastAppliedProductionPlan,
        anchorNodeIds: [anchorId],
        referenceImageNodeId: refImageId,
      })
      if (result.error) {
        handleError(new Error(result.message ?? result.error), 'agentExpandShots')
        return
      }
      if (isValidGraphPatch(result.patch)) {
        setPendingPatch(result.patch, result.planWarnings ?? [])
        showToast(t('agent.expandShotsReady'), 'info')
      }
    } catch (err) {
      handleError(err, 'agentExpandShots')
    }
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
          <button
            type="button"
            disabled={!isValidProductionPlan(lastAppliedProductionPlan)}
            onClick={() => void expandShots()}
            className="px-2 py-0.5 rounded bg-accent/20 text-accent disabled:opacity-40"
          >
            {t('agent.expandShots')}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">④ {t('agent.handoffCompose')}</span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!handoff.composeNodeId || !handoff.scriptNodeId}
              onClick={wireComposeFromStoryboard}
              className="px-2 py-0.5 rounded border border-accent/30 text-accent disabled:opacity-40"
            >
              {t('agent.wireComposeTakes')}
            </button>
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
