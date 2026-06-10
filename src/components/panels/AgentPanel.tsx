import { useState, useEffect, useRef } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useDagRun } from '../../hooks/useDagRun'
import { applyWorkflowPlan } from '../../utils/applyWorkflowPlan'
import { WorkflowPlanPreview } from './WorkflowPlanPreview'
import { AgentTemplateCards } from '../agent/AgentTemplateCards'
import { handleError } from '../../utils/ErrorHandler'
import { isValidWorkflowPlan } from '../../utils/parseWorkflowPlan'
import { loadAgentPreferences } from '../../utils/agentPreferences'
import { useT } from '../../i18n'
import type { AgentSessionSummary, WorkflowPlan } from '../../types/agent'
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const openSettings = useEditorShellStore((s) => s.openSettings)
  const {
    messages,
    pendingPlan,
    pendingPlanWarnings,
    suggestedTemplates,
    lastUserIntent,
    sending,
    sessionId,
    appendMessage,
    setPendingPlan,
    setSuggestedTemplates,
    setLastUserIntent,
    setSending,
    setSessionId,
    setMessages,
  } = useAgentStore()
  const addNode = useCanvasStore((s) => s.addNode)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const viewport = useCanvasStore((s) => s.viewport)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const { startRun } = useDagRun()

  useEffect(() => {
    void window.api.config.read().then(setConfig)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingPlan, suggestedTemplates])

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
    setSuggestedTemplates([])
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

  const sendMessage = async (opts?: { freePlan?: boolean; text?: string }) => {
    const text = (opts?.text ?? input).trim()
    if (!text || sending) return
    if (!opts?.text) setInput('')
    setSending(true)
    if (!opts?.freePlan) {
      setPendingPlan(null)
      setSuggestedTemplates([])
    }
    setLastUserIntent(text)

    appendMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

    try {
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
      handleError(err, 'agentChat')
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
    } catch (err) {
      handleError(err, 'agentBuildFromTemplate')
    } finally {
      setSending(false)
    }
  }

  const applyPlan = (plan: WorkflowPlan, autoRun: boolean) => {
    const offset = {
      x: -viewport.x / viewport.zoom + 120,
      y: -viewport.y / viewport.zoom + 120,
    }
    const { nodes, edges } = applyWorkflowPlan(plan, offset)
    for (const node of nodes) addNode(node)
    for (const edge of edges) {
      addConnection({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })
    }
    setPendingPlan(null)

    const prefs = loadAgentPreferences()
    const shouldAutoRun = autoRun && prefs.autoRunAfterConfirm
    if (shouldAutoRun && plan.executionMode === 'auto' && currentProjectId) {
      void startRun(nodes.map((n) => n.id))
    }
  }

  const showQuickTemplates = messages.length === 0 && suggestedTemplates.length === 0

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
            onConfirm={() => applyPlan(pendingPlan, true)}
            onDismiss={() => setPendingPlan(null)}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 border-t border-border">
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
            placeholder={t('agent.inputPlaceholder')}
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
