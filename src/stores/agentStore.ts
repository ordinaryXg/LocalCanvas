import { create } from 'zustand'
import type { AgentMessage, SuggestedTemplate, WorkflowPlan } from '../types/agent'

interface AgentState {
  panelOpen: boolean
  sessionId: string | null
  messages: AgentMessage[]
  pendingPlan: WorkflowPlan | null
  pendingPlanWarnings: string[]
  suggestedTemplates: SuggestedTemplate[]
  lastUserIntent: string
  sending: boolean
  setPanelOpen: (open: boolean) => void
  setSessionId: (id: string | null) => void
  setMessages: (messages: AgentMessage[]) => void
  appendMessage: (message: AgentMessage) => void
  setPendingPlan: (plan: WorkflowPlan | null, warnings?: string[]) => void
  setSuggestedTemplates: (templates: SuggestedTemplate[]) => void
  setLastUserIntent: (intent: string) => void
  setSending: (sending: boolean) => void
  reset: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  panelOpen: false,
  sessionId: null,
  messages: [],
  pendingPlan: null,
  pendingPlanWarnings: [],
  suggestedTemplates: [],
  lastUserIntent: '',
  sending: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setPendingPlan: (pendingPlan, warnings = []) =>
    set({ pendingPlan, pendingPlanWarnings: warnings, suggestedTemplates: [] }),
  setSuggestedTemplates: (suggestedTemplates) =>
    set({ suggestedTemplates, pendingPlan: null, pendingPlanWarnings: [] }),
  setLastUserIntent: (lastUserIntent) => set({ lastUserIntent }),
  setSending: (sending) => set({ sending }),
  reset: () =>
    set({
      sessionId: null,
      messages: [],
      pendingPlan: null,
      pendingPlanWarnings: [],
      suggestedTemplates: [],
      lastUserIntent: '',
      sending: false,
    }),
}))
