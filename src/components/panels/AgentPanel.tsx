import { useState, useEffect, useRef, useMemo } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useDagRun } from '../../hooks/useDagRun'
import { applyWorkflowPlan } from '../../utils/applyWorkflowPlan'
import { applyGraphPatch } from '../../utils/applyGraphPatch'
import { buildAgentCanvasContext } from '../../utils/buildAgentCanvasContext'
import { WorkflowPlanPreview } from './WorkflowPlanPreview'
import { GraphPatchPreview } from '../agent/GraphPatchPreview'
import { AgentTemplateCards } from '../agent/AgentTemplateCards'
import { AgentHandoffBar } from '../agent/AgentHandoffBar'
import { AgentPhaseRail } from '../agent/AgentPhaseRail'
import { AgentBriefCard } from '../agent/AgentBriefCard'
import { AgentShotList } from '../agent/AgentShotList'
import { handleError, showToast } from '../../utils/ErrorHandler'
import {
  parseBriefFromIntent,
  buildDraftShotList,
  type AgentBriefDraft,
} from '../../utils/agentDraftStudio'
import { computePhaseRail } from '../../utils/agentPhaseState'
import { isValidGraphPatch } from '../../utils/parseGraphPatch'
import { isValidWorkflowPlan } from '../../utils/parseWorkflowPlan'
import { loadAgentPreferences, resolveAgentMode } from '../../utils/agentPreferences'
import { useT } from '../../i18n'
import type { AgentMode, AgentSessionSummary, GraphPatch, WorkflowPlan } from '../../types/agent'
import type { AppConfig } from '../../types/config'

const EXAMPLE_PROMPTS = [
  '30 秒咖啡品牌广告，竖屏，多镜头',
  '2 分钟故事短片，两个角色',
  '5 秒产品空镜（单镜头）',
]

function disabledTemplateIds(): string[] {
  return loadAgentPreferences().disabledTemplateIds
}

export function AgentPanel() {
  const t = useT()
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [briefDraft, setBriefDraft] = useState<AgentBriefDraft | null>(null)
  const [briefConfirmed, setBriefConfirmed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const openSettings = useEditorShellStore((s) => s.openSettings)
  const {
    messages,
    pendingPlan,
    pendingPlanWarnings,
    pendingPatch,
    pendingPatchWarnings,
    suggestedTemplates,
    lastUserIntent,
    sending,
    sessionId,
    agentModeOverride,
    handoff,
    appendMessage,
    setPendingPlan,
    setPendingPatch,
    setSuggestedTemplates,
    setLastUserIntent,
    setSending,
    setSessionId,
    setMessages,
    setAgentModeOverride,
    setHandoff,
  } = useAgentStore()
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  const addNode = useCanvasStore((s) => s.addNode)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const removeNodes = useCanvasStore((s) => s.removeNodes)
  const removeEdges = useCanvasStore((s) => s.removeEdges)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const viewport = useCanvasStore((s) => s.viewport)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const { startRun } = useDagRun()

  const prefs = useMemo(() => loadAgentPreferences(), [messages.length, pendingPlan, pendingPatch])
  const effectiveMode = resolveAgentMode(prefs, selectedNodeIds.length, agentModeOverride)

  const focusedNodes = useMemo(
    () => nodes.filter((n) => selectedNodeIds.includes(n.id)),
    [nodes, selectedNodeIds],
  )

  const isStudioFlow = useMemo(
    () =>
      handoff !== null ||
      pendingPlan?.executionMode === 'checkpoint' ||
      pendingPlan?.skillId === 'script-to-film',
    [handoff, pendingPlan],
  )

  const draftShots = useMemo(() => {
    if (!briefConfirmed || !briefDraft || !lastUserIntent) return []
    return buildDraftShotList(lastUserIntent, briefDraft)
  }, [briefConfirmed, briefDraft, lastUserIntent])

  const phaseRail = useMemo(
    () =>
      computePhaseRail({
        briefConfirmed,
        hasShotPreview: draftShots.length > 0,
        handoff,
        nodes,
      }),
    [briefConfirmed, draftShots.length, handoff, nodes],
  )

  useEffect(() => {
    void window.api.config.read().then(setConfig)
  }, [])

  useEffect(() => {
    if (!isStudioFlow || !lastUserIntent) {
      setBriefDraft(null)
      setBriefConfirmed(false)
      return
    }
    setBriefDraft(parseBriefFromIntent(lastUserIntent))
  }, [isStudioFlow, lastUserIntent])

  useEffect(() => {
    setBriefConfirmed(false)
  }, [lastUserIntent])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingPlan, pendingPatch, suggestedTemplates, handoff])

  useEffect(() => {
    void window.api.agent.listSessions(currentProjectId ?? undefined).then(setSessions)
  }, [currentProjectId, sessionId, messages.length])

  const loadSession = async (id: string) => {
    const detail = await window.api.agent.getSession(id)
    if (!detail) return
    setSessionId(detail.id)
    setMessages(detail.messages)
    setPendingPlan(detail.lastPlan ?? null)
    setSuggestedTemplates([])
    setHistoryOpen(false)
  }

  const startNewSession = () => {
    setSessionId(null)
    setMessages([])
    setPendingPlan(null)
    setPendingPatch(null)
    setSuggestedTemplates([])
    setHandoff(null)
    setBriefDraft(null)
    setBriefConfirmed(false)
    setHistoryOpen(false)
  }

  const applyPlanResult = (plan: WorkflowPlan | undefined, warnings: string[] = []) => {
    if (isValidWorkflowPlan(plan)) {
      setPendingPlan(plan, warnings)
      setSuggestedTemplates([])
    } else if (plan) {
      handleError(new Error('Agent 返回的工作流计划格式无效'), 'agentChat')
    }
  }

  const applyPatchResult = (patch: GraphPatch | undefined, warnings: string[] = []) => {
    if (isValidGraphPatch(patch)) {
      setPendingPatch(patch, warnings)
      setSuggestedTemplates([])
    } else if (patch) {
      handleError(new Error('Agent 返回的图补丁格式无效'), 'agentBuildPatch')
    }
  }

  const sendMessage = async (opts?: { freePlan?: boolean; text?: string }) => {
    const text = (opts?.text ?? input).trim()
    if (!text || sending) return
    if (!opts?.text) setInput('')
    setSending(true)
    if (!opts?.freePlan) {
      setPendingPlan(null)
      setPendingPatch(null)
      setSuggestedTemplates([])
    }
    setLastUserIntent(text)

    appendMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

    try {
      if (effectiveMode === 'build') {
        if (selectedNodeIds.length === 0) {
          handleError(new Error(t('agent.buildNeedsSelection')), 'agentBuildPatch')
          return
        }
        const { canvasNodes, canvasEdges } = buildAgentCanvasContext(
          nodes,
          edges,
          selectedNodeIds,
        )
        const result = await window.api.agent.buildPatch({
          message: text,
          sessionId: sessionId ?? undefined,
          focusedNodeIds: selectedNodeIds,
          canvasNodes,
          canvasEdges,
        })
        if (result.error) {
          handleError(new Error(result.message ?? result.error), 'agentBuildPatch')
          return
        }
        if (result.sessionId) setSessionId(result.sessionId)
        appendMessage({
          role: 'assistant',
          content: result.reply,
          timestamp: new Date().toISOString(),
        })
        applyPatchResult(result.patch, result.planWarnings ?? [])
        return
      }

      const result = await window.api.agent.chat({
        message: text,
        sessionId: sessionId ?? undefined,
        disabledSkills: disabledTemplateIds(),
        freePlan: opts?.freePlan,
      })

      if (result.error) {
        handleError(new Error(result.message ?? result.error), 'agentChat')
        return
      }

      const reply = typeof result.reply === 'string' ? result.reply : String(result.reply ?? '')
      if (result.sessionId) setSessionId(result.sessionId)

      appendMessage({
        role: 'assistant',
        content: reply,
        plan: isValidWorkflowPlan(result.plan) ? result.plan : undefined,
        timestamp: new Date().toISOString(),
      })

      if (result.suggestedTemplates?.length) {
        setSuggestedTemplates(result.suggestedTemplates)
        return
      }

      applyPlanResult(result.plan, result.planWarnings ?? [])
    } catch (err) {
      handleError(err, effectiveMode === 'build' ? 'agentBuildPatch' : 'agentChat')
    } finally {
      setSending(false)
    }
  }

  const adoptTemplate = async (templateId: string) => {
    const intent = lastUserIntent || input.trim()
    if (!intent || sending) return
    setSending(true)
    try {
      const result = await window.api.agent.buildFromTemplate({
        skillId: templateId,
        intent,
        sessionId: sessionId ?? undefined,
        disabledSkills: disabledTemplateIds(),
      })
      if (result.error) {
        handleError(new Error(result.message ?? result.error), 'agentBuildFromTemplate')
        return
      }
      if (result.sessionId) setSessionId(result.sessionId)
      appendMessage({
        role: 'assistant',
        content: result.reply,
        plan: isValidWorkflowPlan(result.plan) ? result.plan : undefined,
        timestamp: new Date().toISOString(),
      })
      applyPlanResult(result.plan, result.planWarnings ?? [])
      showToast(t('agent.toastTemplateAdopted'), 'info')
    } catch (err) {
      handleError(err, 'agentBuildFromTemplate')
    } finally {
      setSending(false)
    }
  }

  const maybeShowHandoff = (plan: WorkflowPlan, idMap: Map<string, string>) => {
    if (plan.executionMode !== 'checkpoint' && plan.skillId !== 'script-to-film') return
    const scriptTemp = plan.nodes.find((n) => n.type === 'script')?.tempId
    const composeTemp = plan.nodes.find((n) => n.type === 'compose')?.tempId
    setHandoff({
      step: 'script',
      scriptNodeId: scriptTemp ? idMap.get(scriptTemp) : undefined,
      composeNodeId: composeTemp ? idMap.get(composeTemp) : undefined,
      collapsed: false,
    })
  }

  const applyPlan = (plan: WorkflowPlan) => {
    const offset = {
      x: -viewport.x / viewport.zoom + 120,
      y: -viewport.y / viewport.zoom + 120,
    }
    const { nodes: newNodes, edges: newEdges, idMap } = applyWorkflowPlan(plan, offset)
    for (const node of newNodes) addNode(node)
    for (const edge of newEdges) {
      addConnection({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })
    }
    setPendingPlan(null)
    maybeShowHandoff(plan, idMap)

    const currentPrefs = loadAgentPreferences()
    const shouldAutoRun =
      currentPrefs.autoRunAfterConfirm && plan.executionMode === 'auto' && currentProjectId
    if (shouldAutoRun) {
      void startRun(newNodes.map((n) => n.id))
    }
    showToast(t('agent.toastPlanApplied'), 'info')
  }

  const applyPatch = (patch: GraphPatch) => {
    const result = applyGraphPatch({ patch, nodes, edges })
    if (result.error) {
      handleError(new Error(result.error), 'agentBuildPatch')
      return
    }
    for (const { nodeId, data } of result.dataUpdates) {
      updateNodeData(nodeId, data)
    }
    if (result.nodeIdsToRemove.length > 0) removeNodes(result.nodeIdsToRemove)
    if (result.edgeIdsToRemove.length > 0) removeEdges(result.edgeIdsToRemove)
    for (const node of result.nodesToAdd) addNode(node)
    for (const edge of result.edgesToAdd) {
      addConnection({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })
    }
    setPendingPatch(null)

    const currentPrefs = loadAgentPreferences()
    if (
      patch.executionMode === 'auto' &&
      currentPrefs.autoRunAfterConfirm &&
      currentProjectId &&
      result.nodesToAdd.length > 0
    ) {
      void startRun(result.nodesToAdd.map((n) => n.id))
    }
    showToast(t('agent.toastPatchApplied'), 'info')
  }

  const showQuickTemplates =
    messages.length === 0 && suggestedTemplates.length === 0 && effectiveMode === 'plan'

  const modeButtonClass = (mode: AgentMode) =>
    `text-[10px] px-2 py-1 rounded-full transition ${
      effectiveMode === mode ? 'bg-accent text-white' : 'text-text-muted hover:text-white'
    }`

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-white"
        >
          历史{sessions.length > 0 ? ` (${sessions.length})` : ''}
        </button>
        <button
          type="button"
          onClick={startNewSession}
          className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-white"
        >
          新对话
        </button>
        <button
          type="button"
          onClick={() => openSettings({ tab: 'agent' })}
          className="ml-auto text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-white"
        >
          {t('settings.tabAgent')}
        </button>
      </div>
      {historyOpen && sessions.length > 0 && (
        <div className="shrink-0 max-h-32 overflow-y-auto lc-scroll border-b border-border px-2 py-1 space-y-0.5">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void loadSession(s.id)}
              className={`w-full text-left text-[10px] px-2 py-1.5 rounded truncate hover:bg-bg-tertiary ${
                sessionId === s.id ? 'text-[var(--studio-accent)]' : 'text-text-muted'
              }`}
            >
              {s.title || '未命名会话'} · {new Date(s.updatedAt).toLocaleString('zh-CN')}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto lc-scroll p-3 space-y-3">
        {isStudioFlow && briefDraft && (
          <div className="space-y-2">
            <AgentPhaseRail phases={phaseRail} />
            <AgentBriefCard
              brief={briefDraft}
              confirmed={briefConfirmed}
              onChange={(patch) => setBriefDraft((b) => (b ? { ...b, ...patch } : b))}
              onConfirm={() => {
                setBriefConfirmed(true)
                showToast(t('agent.toastBriefConfirmed'), 'info')
              }}
            />
            {briefConfirmed && draftShots.length > 0 && <AgentShotList shots={draftShots} />}
          </div>
        )}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-text-muted">{t('agent.emptyHint')}</p>
            <div className="space-y-1">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setInput(example)}
                  className="block text-[10px] text-text-muted hover:text-accent text-left"
                >
                  · {example}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.timestamp}-${i}`}
            className={`text-xs rounded-lg px-3 py-2 ${
              m.role === 'user'
                ? 'bg-accent/20 text-text-primary ml-4'
                : 'bg-bg-tertiary text-text-primary mr-4'
            }`}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.role === 'assistant' &&
              i === messages.length - 1 &&
              suggestedTemplates.length > 0 && (
                <AgentTemplateCards
                  templates={suggestedTemplates}
                  config={config}
                  disabled={sending}
                  onAdopt={(id) => void adoptTemplate(id)}
                  onSkip={() => void sendMessage({ freePlan: true, text: lastUserIntent })}
                />
              )}
          </div>
        ))}
        {showQuickTemplates && (
          <AgentTemplateCards
            templates={[]}
            config={config}
            disabled={sending}
            onAdopt={(id) => {
              const intent = input.trim() || t('agent.templateDefaultIntent')
              setInput(intent)
              setLastUserIntent(intent)
              void adoptTemplate(id)
            }}
            onSkip={() => {}}
          />
        )}
        {pendingPlan && (
          <WorkflowPlanPreview
            plan={pendingPlan}
            warnings={pendingPlanWarnings}
            onConfirm={() => applyPlan(pendingPlan)}
            onDismiss={() => setPendingPlan(null)}
            confirmDisabled={isStudioFlow && !briefConfirmed}
          />
        )}
        {pendingPatch && (
          <GraphPatchPreview
            patch={pendingPatch}
            warnings={pendingPatchWarnings}
            onConfirm={() => applyPatch(pendingPatch)}
            onDismiss={() => setPendingPatch(null)}
          />
        )}
        {handoff && <AgentHandoffBar handoff={handoff} />}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-1 rounded-full bg-bg-tertiary p-0.5 w-fit">
          <button
            type="button"
            className={modeButtonClass('plan')}
            onClick={() => setAgentModeOverride('plan')}
          >
            Plan
          </button>
          <button
            type="button"
            className={modeButtonClass('build')}
            onClick={() => setAgentModeOverride('build')}
          >
            Build
          </button>
        </div>
        {focusedNodes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {focusedNodes.map((n) => (
              <span
                key={n.id}
                className="text-[10px] px-2 py-0.5 rounded-full border border-accent/40 text-accent"
              >
                {(n.data?.label as string) || n.type}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={
              effectiveMode === 'build'
                ? t('agent.buildInputPlaceholder')
                : t('agent.inputPlaceholder')
            }
            rows={2}
            className="flex-1 bg-bg-tertiary border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent resize-none"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="px-4 py-2 rounded bg-accent text-white text-xs disabled:opacity-50 self-end"
          >
            {sending ? '...' : t('agent.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
