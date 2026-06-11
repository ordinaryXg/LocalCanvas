import { useState, useEffect, useRef, useMemo } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useDagRun } from '../../hooks/useDagRun'
import { useDagRunStore } from '../../stores/dagRunStore'
import { canAutoStartDagRun } from '../../utils/canvasGenerationState'
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
import { tryBuildRuleBasedGraphPatch } from '../../utils/buildRuleBasedGraphPatch'
import { isPatchConfirmMessage, isPlanConfirmMessage } from '../../utils/agentConfirmIntent'
import { isValidGraphPatch } from '../../utils/parseGraphPatch'
import { ProductionPlanPreview } from '../agent/ProductionPlanPreview'
import { applyProductionPlan } from '../../utils/applyProductionPlan'
import { applyRebalanceToProductionPlan } from '../../utils/durationRebalance'
import { isValidProductionPlan } from '../../utils/buildProductionPlan'
import { classifyFilmTrack, isStudioTemplateId } from '../../utils/filmTypeClassifier'
import { briefToCreativeBibleEntries } from '../../utils/creativeBible'
import { isValidWorkflowPlan } from '../../utils/parseWorkflowPlan'
import { loadAgentPreferences, resolveAgentMode } from '../../utils/agentPreferences'
import { useT } from '../../i18n'
import type { AgentMode, AgentSessionSummary, GraphPatch, ProductionPlan, ShotSpec, WorkflowPlan } from '../../types/agent'
import type { AppConfig } from '../../types/config'

const EXAMPLE_PROMPTS = [
  '30 秒咖啡品牌广告，竖屏，多镜头',
  '2 分钟故事短片，两个角色',
  '5 秒产品空镜（单镜头）',
]

function disabledTemplateIds(): string[] {
  return loadAgentPreferences().disabledTemplateIds
}

function shotSpecToDraft(shot: ShotSpec) {
  return {
    sequence: shot.sequence,
    beat: shot.beat ?? 'BEAT',
    durationSec: shot.durationSec,
    mode: (shot.productionMode ?? 'i2v') as 'i2v' | 't2v' | 'flf',
    summary: shot.description,
  }
}

function briefDraftToProductionBrief(draft: AgentBriefDraft) {
  return {
    title: draft.mustInclude.slice(0, 40) || '未命名项目',
    filmType: draft.filmType,
    targetDurationSec: draft.durationSec ?? 30,
    aspectRatio: draft.aspectRatio ?? '16:9',
    tone: draft.tone,
    mustInclude: draft.mustInclude,
  }
}

export function AgentPanel() {
  const t = useT()
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([])
  const [panelTab, setPanelTab] = useState<'chat' | 'history'>('chat')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [briefDraft, setBriefDraft] = useState<AgentBriefDraft | null>(null)
  const [briefConfirmed, setBriefConfirmed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevIntentRef = useRef<string | null>(null)
  const openSettings = useEditorShellStore((s) => s.openSettings)
  const {
    messages,
    pendingPlan,
    pendingPlanWarnings,
    pendingProductionPlan,
    pendingPatch,
    pendingPatchWarnings,
    suggestedTemplates,
    lastUserIntent,
    sending,
    sessionId,
    agentModeOverride,
    buildFocusedNodeIds,
    handoff,
    appendMessage,
    setPendingPlan,
    setPendingProductionPlan,
    setPendingPatch,
    setSuggestedTemplates,
    setLastUserIntent,
    setSending,
    setSessionId,
    setMessages,
    setAgentModeOverride,
    setBuildFocusedNodeIds,
    setHandoff,
    setLastAppliedProductionPlan,
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

  const activeFocusIds = useMemo(
    () => (selectedNodeIds.length > 0 ? selectedNodeIds : buildFocusedNodeIds),
    [selectedNodeIds, buildFocusedNodeIds],
  )

  const effectiveMode = resolveAgentMode(prefs, activeFocusIds.length, agentModeOverride)

  const focusedNodes = useMemo(
    () => nodes.filter((n) => activeFocusIds.includes(n.id)),
    [nodes, activeFocusIds],
  )

  useEffect(() => {
    if (selectedNodeIds.length > 0) {
      setBuildFocusedNodeIds(selectedNodeIds)
    }
  }, [selectedNodeIds, setBuildFocusedNodeIds])

  const filmTrack = useMemo(
    () => classifyFilmTrack(lastUserIntent, prefs.defaultTrack),
    [lastUserIntent, prefs.defaultTrack],
  )

  const isStudioFlow = useMemo(
    () =>
      filmTrack.track === 'studio' ||
      pendingProductionPlan !== null ||
      handoff !== null ||
      pendingPlan?.executionMode === 'checkpoint' ||
      pendingPlan?.skillId === 'script-to-film' ||
      (pendingPlan?.skillId != null && isStudioTemplateId(pendingPlan.skillId)),
    [filmTrack.track, handoff, pendingPlan, pendingProductionPlan],
  )

  const draftShots = useMemo(() => {
    if (pendingProductionPlan?.shots.length) {
      return pendingProductionPlan.shots.map(shotSpecToDraft)
    }
    if (!briefConfirmed || !briefDraft || !lastUserIntent) return []
    return buildDraftShotList(lastUserIntent, briefDraft)
  }, [briefConfirmed, briefDraft, lastUserIntent, pendingProductionPlan])

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
      prevIntentRef.current = null
      return
    }
    if (prevIntentRef.current != null && prevIntentRef.current !== lastUserIntent) {
      setBriefConfirmed(false)
    }
    prevIntentRef.current = lastUserIntent
    setBriefDraft(parseBriefFromIntent(lastUserIntent))
  }, [isStudioFlow, lastUserIntent])

  useEffect(() => {
    if (handoff) setBriefConfirmed(true)
  }, [handoff])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, suggestedTemplates])

  useEffect(() => {
    void window.api.agent.listSessions(currentProjectId ?? undefined).then(setSessions)
  }, [currentProjectId, sessionId, messages.length])

  const loadSession = async (id: string) => {
    const detail = await window.api.agent.getSession(id)
    if (!detail) return
    setSessionId(detail.id)
    setMessages(detail.messages)
    setPendingPlan(detail.lastPlan ?? null)
    setPendingProductionPlan(detail.lastProductionPlan ?? null)
    setSuggestedTemplates([])
  }

  const startNewSession = () => {
    setPanelTab('chat')
    setSessionId(null)
    setMessages([])
    setPendingPlan(null)
    setPendingProductionPlan(null)
    setPendingPatch(null)
    setSuggestedTemplates([])
    setHandoff(null)
    setLastAppliedProductionPlan(null)
    setBuildFocusedNodeIds([])
    setBriefDraft(null)
    setBriefConfirmed(false)
  }

  const tryAutoRunNodes = (nodeIds: string[]) => {
    const guard = canAutoStartDagRun(
      useCanvasStore.getState().nodes,
      useDagRunStore.getState().isRunning,
    )
    if (!guard.ok) {
      if (guard.message) showToast(guard.message, 'info')
      return
    }
    void startRun(nodeIds)
  }

  const applyPlanResult = (
    plan: WorkflowPlan | undefined,
    warnings: string[] = [],
    productionPlan?: ProductionPlan,
  ) => {
    if (isValidProductionPlan(productionPlan)) {
      setPendingProductionPlan(productionPlan, warnings)
      setSuggestedTemplates([])
    } else if (isValidWorkflowPlan(plan)) {
      setPendingPlan(plan, warnings)
      setSuggestedTemplates([])
    } else if (plan) {
      handleError(new Error('Agent 返回的工作流计划格式无效'), 'agentChat')
    }
  }

  const findApplicableProductionPlan = (): ProductionPlan | null => {
    const queued = useAgentStore.getState().pendingProductionPlan
    if (isValidProductionPlan(queued)) return queued
    const msgs = useAgentStore.getState().messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m.role === 'assistant' && isValidProductionPlan(m.productionPlan)) return m.productionPlan!
    }
    return null
  }

  const findApplicablePlan = (): WorkflowPlan | null => {
    const production = findApplicableProductionPlan()
    if (production) return production.workflow
    const queued = useAgentStore.getState().pendingPlan
    if (isValidWorkflowPlan(queued)) return queued
    const msgs = useAgentStore.getState().messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m.role === 'assistant' && isValidWorkflowPlan(m.plan)) return m.plan!
    }
    return null
  }

  const clearAllPlanPreviews = () => {
    setPendingPlan(null)
    setPendingProductionPlan(null)
    setMessages(
      useAgentStore.getState().messages.map((m) =>
        m.plan || m.productionPlan
          ? { ...m, plan: undefined, planWarnings: undefined, productionPlan: undefined }
          : m,
      ),
    )
  }

  const dismissPlan = (messageIndex: number) => {
    setPendingPlan(null)
    setPendingProductionPlan(null)
    setMessages(
      useAgentStore.getState().messages.map((m, i) =>
        i === messageIndex
          ? { ...m, plan: undefined, planWarnings: undefined, productionPlan: undefined }
          : m,
      ),
    )
  }

  const handleRebalancePlan = (plan: ProductionPlan) => {
    const updated = applyRebalanceToProductionPlan(plan)
    setPendingProductionPlan(updated)
    setMessages(
      useAgentStore.getState().messages.map((m) =>
        m.productionPlan && m.productionPlan.templateId === plan.templateId
          ? { ...m, productionPlan: updated }
          : m,
      ),
    )
    showToast(t('agent.rebalanceApplied'), 'info')
  }

  const resolveGraphPatch = (
    patch: GraphPatch | undefined,
    fallbackRequest?: {
      message: string
      focusedNodeIds: string[]
      canvasNodes: ReturnType<typeof buildAgentCanvasContext>['canvasNodes']
    },
  ): GraphPatch | null => {
    let resolved = patch
    if (!isValidGraphPatch(resolved) && fallbackRequest) {
      resolved = tryBuildRuleBasedGraphPatch(fallbackRequest) ?? undefined
    }
    if (isValidGraphPatch(resolved)) return resolved
    if (patch) {
      handleError(new Error('Agent 返回的图补丁格式无效'), 'agentBuildPatch')
    }
    return null
  }

  const findApplicablePatch = (): GraphPatch | null => {
    const queued = useAgentStore.getState().pendingPatch
    if (isValidGraphPatch(queued)) return queued
    const msgs = useAgentStore.getState().messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m.role === 'assistant' && isValidGraphPatch(m.patch)) return m.patch!
    }
    const intent = useAgentStore.getState().lastUserIntent
    const focusedIds = resolveBuildFocusIds()
    if (!intent || focusedIds.length === 0) return null
    const storeNodes = useCanvasStore.getState().nodes
    const storeEdges = useCanvasStore.getState().edges
    const { canvasNodes } = buildAgentCanvasContext(storeNodes, storeEdges, focusedIds)
    return resolveGraphPatch(undefined, { message: intent, focusedNodeIds: focusedIds, canvasNodes })
  }

  const clearAllPatchPreviews = () => {
    setPendingPatch(null)
    setMessages(
      useAgentStore.getState().messages.map((m) =>
        m.patch ? { ...m, patch: undefined, patchWarnings: undefined } : m,
      ),
    )
  }

  const dismissPatch = (messageIndex: number) => {
    setPendingPatch(null)
    setMessages(
      messages.map((m, i) =>
        i === messageIndex ? { ...m, patch: undefined, patchWarnings: undefined } : m,
      ),
    )
  }

  const hasPatchPreview = useMemo(
    () => messages.some((m) => isValidGraphPatch(m.patch)) || pendingPatch !== null,
    [messages, pendingPatch],
  )

  const hasPlanPreview = useMemo(
    () => messages.some((m) => isValidWorkflowPlan(m.plan)) || pendingPlan !== null,
    [messages, pendingPlan],
  )

  const resolveBuildFocusIds = () => {
    const selected = useCanvasStore.getState().selectedNodeIds
    const stored = useAgentStore.getState().buildFocusedNodeIds
    return selected.length > 0 ? selected : stored
  }

  const resolveCurrentMode = () => {
    const focusCount = resolveBuildFocusIds().length
    const override = useAgentStore.getState().agentModeOverride
    return resolveAgentMode(loadAgentPreferences(), focusCount, override)
  }

  const sendMessage = async (opts?: { freePlan?: boolean; text?: string }) => {
    const text = (opts?.text ?? input).trim()
    if (!text || sending) return

    const queuedPatch = findApplicablePatch()

    if (!opts?.freePlan && isPatchConfirmMessage(text, t('agent.applyPatch'))) {
      if (!opts?.text) setInput('')
      appendMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })
      if (queuedPatch) {
        applyPatch(queuedPatch)
      } else {
        showToast(t('agent.patchNotGenerated'), 'info')
      }
      return
    }

    if (
      !opts?.freePlan &&
      isPlanConfirmMessage(text, t('agent.applyPlan')) &&
      !(isStudioFlow && !briefConfirmed)
    ) {
      if (!opts?.text) setInput('')
      appendMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })
      const productionPlan = findApplicableProductionPlan()
      if (productionPlan) {
        applyProductionPlanToCanvas(productionPlan)
      } else {
        const plan = findApplicablePlan()
        if (plan) {
          applyPlan(plan)
        } else {
          showToast(t('agent.planNotGenerated'), 'info')
        }
      }
      return
    }

    if (!opts?.text) setInput('')
    setSending(true)
    if (!opts?.freePlan) {
      setPendingPlan(null)
      setPendingProductionPlan(null)
      setPendingPatch(null)
      setSuggestedTemplates([])
    }
    setLastUserIntent(text)

    appendMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

    const mode = resolveCurrentMode()
    const focusedIds = resolveBuildFocusIds()

    try {
      if (mode === 'build') {
        if (focusedIds.length === 0) {
          handleError(new Error(t('agent.buildNeedsSelection')), 'agentBuildPatch')
          return
        }
        const storeNodes = useCanvasStore.getState().nodes
        const storeEdges = useCanvasStore.getState().edges
        const { canvasNodes, canvasEdges } = buildAgentCanvasContext(
          storeNodes,
          storeEdges,
          focusedIds,
        )
        const result = await window.api.agent.buildPatch({
          message: text,
          sessionId: sessionId ?? undefined,
          focusedNodeIds: focusedIds,
          canvasNodes,
          canvasEdges,
        })
        if (result.error) {
          handleError(new Error(result.message ?? result.error), 'agentBuildPatch')
          return
        }
        if (result.sessionId) setSessionId(result.sessionId)
        const fallbackRequest = {
          message: text,
          focusedNodeIds: focusedIds,
          canvasNodes,
        }
        const resolvedPatch = resolveGraphPatch(result.patch, fallbackRequest)
        appendMessage({
          role: 'assistant',
          content: result.reply,
          patch: resolvedPatch ?? undefined,
          patchWarnings: resolvedPatch ? (result.planWarnings ?? []) : undefined,
          timestamp: new Date().toISOString(),
        })
        if (resolvedPatch) {
          setPendingPatch(resolvedPatch, result.planWarnings ?? [])
          setSuggestedTemplates([])
        } else if (result.reply) {
          showToast(t('agent.patchNotGenerated'), 'info')
        }
        return
      }

      const result = await window.api.agent.chat({
        message: text,
        sessionId: sessionId ?? undefined,
        disabledSkills: disabledTemplateIds(),
        freePlan: opts?.freePlan,
        defaultTrack: prefs.defaultTrack,
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
        planWarnings: isValidWorkflowPlan(result.plan) ? (result.planWarnings ?? []) : undefined,
        productionPlan: isValidProductionPlan(result.productionPlan)
          ? result.productionPlan
          : undefined,
        timestamp: new Date().toISOString(),
      })

      if (result.suggestedTemplates?.length) {
        setSuggestedTemplates(result.suggestedTemplates)
        return
      }

      applyPlanResult(result.plan, result.planWarnings ?? [], result.productionPlan)
      if (isValidProductionPlan(result.productionPlan) || isValidWorkflowPlan(result.plan)) {
        return
      }
      if (reply && !result.plan) {
        showToast(t('agent.planNotGenerated'), 'info')
      }
    } catch (err) {
      handleError(err, mode === 'build' ? 'agentBuildPatch' : 'agentChat')
    } finally {
      setSending(false)
    }
  }

  const adoptTemplate = async (templateId: string, intentOverride?: string) => {
    const intent = (intentOverride ?? (lastUserIntent || input.trim())).trim()
    if (!intent || sending) return
    setLastUserIntent(intent)
    setSending(true)
    try {
      const result = await window.api.agent.buildFromTemplate({
        skillId: templateId,
        intent,
        sessionId: sessionId ?? undefined,
        disabledSkills: disabledTemplateIds(),
        defaultTrack: prefs.defaultTrack,
        brief: briefDraft && briefConfirmed ? briefDraftToProductionBrief(briefDraft) : undefined,
        creativeBible: useProjectStore.getState().metadata.creativeBible,
        takesPerShot: prefs.takesPerShot,
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
        planWarnings: isValidWorkflowPlan(result.plan) ? (result.planWarnings ?? []) : undefined,
        productionPlan: isValidProductionPlan(result.productionPlan)
          ? result.productionPlan
          : undefined,
        timestamp: new Date().toISOString(),
      })
      applyPlanResult(result.plan, result.planWarnings ?? [], result.productionPlan)
      showToast(t('agent.toastTemplateAdopted'), 'info')
    } catch (err) {
      handleError(err, 'agentBuildFromTemplate')
    } finally {
      setSending(false)
    }
  }

  const maybeShowHandoff = (plan: WorkflowPlan, idMap: Map<string, string>) => {
    const isCheckpoint =
      plan.executionMode === 'checkpoint' ||
      plan.skillId === 'script-to-film' ||
      (plan.skillId != null && isStudioTemplateId(plan.skillId))
    if (!isCheckpoint) return
    const scriptTemp = plan.nodes.find((n) => n.type === 'script')?.tempId
    const composeTemp = plan.nodes.find((n) => n.type === 'compose')?.tempId
    setHandoff({
      step: 'script',
      scriptNodeId: scriptTemp ? idMap.get(scriptTemp) : undefined,
      composeNodeId: composeTemp ? idMap.get(composeTemp) : undefined,
      collapsed: false,
    })
  }

  const applyProductionPlanToCanvas = (productionPlan: ProductionPlan) => {
    const offset = {
      x: -viewport.x / viewport.zoom + 120,
      y: -viewport.y / viewport.zoom + 120,
    }
    const { nodes: newNodes, edges: newEdges, idMap, error } = applyProductionPlan(
      productionPlan,
      offset,
    )
    if (error) {
      handleError(new Error(error), 'agentProductionPlan')
      return
    }
    for (const node of newNodes) addNode(node)
    for (const edge of newEdges) {
      addConnection({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })
    }
    setPendingProductionPlan(null)
    clearAllPlanPreviews()
    useProjectStore
      .getState()
      .mergeCreativeBible(briefToCreativeBibleEntries(productionPlan.brief))
    setLastAppliedProductionPlan(productionPlan)
    maybeShowHandoff(productionPlan.workflow, idMap)
    showToast(t('agent.toastPlanApplied'), 'info')
  }

  const applyPlan = (plan: WorkflowPlan) => {
    const production = useAgentStore.getState().pendingProductionPlan
    if (
      isValidProductionPlan(production) &&
      production.workflow.skillId === plan.skillId &&
      production.workflow.nodes.length === plan.nodes.length
    ) {
      applyProductionPlanToCanvas(production)
      return
    }
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
    clearAllPlanPreviews()
    maybeShowHandoff(plan, idMap)

    const currentPrefs = loadAgentPreferences()
    const shouldAutoRun =
      currentPrefs.autoRunAfterConfirm && plan.executionMode === 'auto' && currentProjectId
    if (shouldAutoRun) {
      tryAutoRunNodes(newNodes.map((n) => n.id))
    }
    showToast(t('agent.toastPlanApplied'), 'info')
  }

  const applyPatch = (patch: GraphPatch) => {
    const storeNodes = useCanvasStore.getState().nodes
    const storeEdges = useCanvasStore.getState().edges
    const result = applyGraphPatch({ patch, nodes: storeNodes, edges: storeEdges })
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
    clearAllPatchPreviews()

    const currentPrefs = loadAgentPreferences()
    if (
      patch.executionMode === 'auto' &&
      currentPrefs.autoRunAfterConfirm &&
      currentProjectId &&
      result.nodesToAdd.length > 0
    ) {
      tryAutoRunNodes(result.nodesToAdd.map((n) => n.id))
    }
    showToast(t('agent.toastPatchApplied'), 'info')
  }

  const showQuickTemplates =
    messages.length === 0 && suggestedTemplates.length === 0 && effectiveMode === 'plan'

  const modeButtonClass = (mode: AgentMode) =>
    `text-[10px] px-2 py-1 rounded-full transition ${
      effectiveMode === mode ? 'bg-accent text-white' : 'text-text-muted hover:text-white'
    }`

  const showMessageActions = panelTab === 'chat'

  const tabButtonClass = (tab: 'chat' | 'history') =>
    `text-[10px] px-3 py-1.5 rounded-t transition border-b-2 ${
      panelTab === tab
        ? 'border-accent text-white bg-bg-tertiary/60'
        : 'border-transparent text-text-muted hover:text-white'
    }`

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-end gap-1 px-2 pt-2 border-b border-border">
        <button type="button" onClick={startNewSession} className={tabButtonClass('chat')}>
          新对话
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('history')}
          className={tabButtonClass('history')}
        >
          历史{sessions.length > 0 ? ` (${sessions.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => openSettings({ tab: 'agent' })}
          className="ml-auto mb-1 text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-white"
        >
          {t('settings.tabAgent')}
        </button>
      </div>
      {panelTab === 'history' ? (
        <div className="flex-1 min-h-0 overflow-y-auto lc-scroll p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-text-muted px-2 py-4">暂无历史会话</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void loadSession(s.id)}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-bg-tertiary ${
                  sessionId === s.id ? 'bg-bg-tertiary text-[var(--studio-accent)]' : 'text-text-muted'
                }`}
              >
                <div className="truncate font-medium">{s.title || '未命名会话'}</div>
                <div className="text-[10px] opacity-70 mt-0.5">
                  {new Date(s.updatedAt).toLocaleString('zh-CN')}
                </div>
              </button>
            ))
          )}
          {sessionId && messages.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <p className="text-[10px] text-text-muted px-1">会话记录（只读）</p>
              {messages.map((m, i) => (
                <div
                  key={`hist-${m.timestamp}-${i}`}
                  className={`text-xs rounded-lg px-3 py-2 ${
                    m.role === 'user'
                      ? 'bg-accent/20 text-text-primary ml-4'
                      : 'bg-bg-tertiary text-text-primary mr-4'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words max-h-48 overflow-y-auto lc-scroll">
                    {typeof m.content === 'string' ? m.content : String(m.content ?? '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lc-scroll p-3 space-y-3">
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
            <div
              className={`whitespace-pre-wrap break-words ${
                m.role === 'assistant' ? 'max-h-48 overflow-y-auto lc-scroll pr-1' : ''
              }`}
            >
              {typeof m.content === 'string' ? m.content : String(m.content ?? '')}
            </div>
            {showMessageActions && m.role === 'assistant' && isValidGraphPatch(m.patch) && !pendingPatch && (
              <GraphPatchPreview
                patch={m.patch!}
                warnings={m.patchWarnings ?? []}
                onConfirm={() => applyPatch(m.patch!)}
                onDismiss={() => dismissPatch(i)}
              />
            )}
            {showMessageActions && m.role === 'assistant' && isValidProductionPlan(m.productionPlan) && !pendingProductionPlan && (
              <ProductionPlanPreview
                plan={m.productionPlan!}
                warnings={m.planWarnings ?? []}
                onConfirm={() => applyProductionPlanToCanvas(m.productionPlan!)}
                onDismiss={() => dismissPlan(i)}
                onRebalance={handleRebalancePlan}
                confirmDisabled={isStudioFlow && !briefConfirmed}
              />
            )}
            {showMessageActions &&
              m.role === 'assistant' &&
              isValidWorkflowPlan(m.plan) &&
              !pendingPlan &&
              !m.productionPlan && (
              <WorkflowPlanPreview
                plan={m.plan!}
                warnings={m.planWarnings ?? []}
                onConfirm={() => applyPlan(m.plan!)}
                onDismiss={() => dismissPlan(i)}
                confirmDisabled={isStudioFlow && !briefConfirmed}
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
              void adoptTemplate(id, intent)
            }}
            onSkip={() => {}}
          />
        )}
      </div>

      {(pendingPlan || pendingProductionPlan || pendingPatch || handoff || suggestedTemplates.length > 0) && (
        <div className="shrink-0 max-h-[min(220px,35vh)] overflow-y-auto lc-scroll border-t border-border bg-bg-secondary/95 px-3 py-2 space-y-2">
          {suggestedTemplates.length > 0 && !pendingPlan && !pendingProductionPlan && (
            <AgentTemplateCards
              templates={suggestedTemplates}
              config={config}
              disabled={sending}
              onAdopt={(id) => void adoptTemplate(id, lastUserIntent || input.trim())}
              onSkip={() => void sendMessage({ freePlan: true, text: lastUserIntent })}
            />
          )}
          {pendingProductionPlan && (
            <ProductionPlanPreview
              plan={pendingProductionPlan}
              warnings={pendingPlanWarnings}
              onConfirm={() => applyProductionPlanToCanvas(pendingProductionPlan)}
              onDismiss={() => setPendingProductionPlan(null)}
              onRebalance={handleRebalancePlan}
              confirmDisabled={isStudioFlow && !briefConfirmed}
            />
          )}
          {pendingPlan && !pendingProductionPlan && (
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
        </div>
      )}

      <div className="shrink-0 p-3 border-t border-border space-y-2 bg-bg-secondary">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-bg-tertiary p-0.5 shrink-0">
            <button
              type="button"
              className={modeButtonClass('plan')}
              onClick={() => {
                setAgentModeOverride('plan')
                setBuildFocusedNodeIds([])
              }}
            >
              Plan
            </button>
            <button
              type="button"
              className={modeButtonClass('build')}
              onClick={() => {
                setAgentModeOverride('build')
                if (selectedNodeIds.length > 0) {
                  setBuildFocusedNodeIds(selectedNodeIds)
                }
              }}
            >
              Build
            </button>
          </div>
          {focusedNodes.length > 0 &&
            focusedNodes.map((n) => (
              <span
                key={n.id}
                className="text-[10px] px-2 py-0.5 rounded-full border border-accent/40 text-accent max-w-[120px] truncate"
              >
                {(n.data?.label as string) || n.type}
              </span>
            ))}
        </div>
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
              hasPatchPreview
                ? t('agent.patchConfirmHint')
                : hasPlanPreview
                  ? t('agent.planConfirmHint')
                  : effectiveMode === 'build'
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
        </>
      )}
    </div>
  )
}
