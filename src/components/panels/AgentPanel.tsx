import { useState, useEffect, useRef } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useDagRun } from '../../hooks/useDagRun'
import { applyWorkflowPlan } from '../../utils/applyWorkflowPlan'
import { WorkflowPlanPreview } from './WorkflowPlanPreview'
import { handleError } from '../../utils/ErrorHandler'
import { isValidWorkflowPlan } from '../../utils/parseWorkflowPlan'
import { useT } from '../../i18n'
import type { AgentSessionSummary, WorkflowPlan } from '../../types/agent'

function loadDisabledSkills(): string[] {
  try {
    const raw = localStorage.getItem('lc-agent-disabled-skills')
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function AgentPanel() {
  const t = useT()
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    pendingPlan,
    sending,
    sessionId,
    appendMessage,
    setPendingPlan,
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingPlan])

  useEffect(() => {
    void window.api.agent.listSessions(currentProjectId ?? undefined).then(setSessions)
  }, [currentProjectId, sessionId, messages.length])

  const loadSession = async (id: string) => {
    const detail = await window.api.agent.getSession(id)
    if (!detail) return
    setSessionId(detail.id)
    setMessages(detail.messages)
    setPendingPlan(detail.lastPlan ?? null)
    setHistoryOpen(false)
  }

  const startNewSession = () => {
    setSessionId(null)
    setMessages([])
    setPendingPlan(null)
    setHistoryOpen(false)
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setPendingPlan(null)

    appendMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

    try {
      const result = await window.api.agent.chat({
        message: text,
        sessionId: sessionId ?? undefined,
        disabledSkills: loadDisabledSkills(),
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

      if (isValidWorkflowPlan(result.plan)) {
        setPendingPlan(result.plan)
      } else if (result.plan) {
        handleError(new Error('Agent 返回的工作流计划格式无效'), 'agentChat')
      }
    } catch (err) {
      handleError(err, 'agentChat')
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

    if (autoRun && plan.executionMode === 'auto' && currentProjectId) {
      void startRun(nodes.map((n) => n.id))
    }
  }

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
          <p className="text-xs text-text-muted">{t('agent.emptyHint')}</p>
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
          </div>
        ))}
        {pendingPlan && (
          <WorkflowPlanPreview
            plan={pendingPlan}
            onConfirm={() => applyPlan(pendingPlan, true)}
            onDismiss={() => setPendingPlan(null)}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={t('agent.inputPlaceholder')}
            className="flex-1 bg-bg-tertiary border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="px-4 py-2 rounded bg-accent text-white text-xs disabled:opacity-50"
          >
            {sending ? '...' : t('agent.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
