import { create } from 'zustand'
import type { AgentMessage, WorkflowPlan } from '../types/agent'

interface AgentState {
  panelOpen: boolean
  sessionId: string | null
  messages: AgentMessage[]
  pendingPlan: WorkflowPlan | null
  sending: boolean
  setPanelOpen: (open: boolean) => void
  setSessionId: (id: string | null) => void
  setMessages: (messages: AgentMessage[]) => void
  appendMessage: (message: AgentMessage) => void
  setPendingPlan: (plan: WorkflowPlan | null) => void
  setSending: (sending: boolean) => void
  reset: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  panelOpen: false,
  sessionId: null,
  messages: [],
  pendingPlan: null,
  sending: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setPendingPlan: (pendingPlan) => set({ pendingPlan }),
  setSending: (sending) => set({ sending }),
  reset: () => set({ sessionId: null, messages: [], pendingPlan: null, sending: false }),
}))
