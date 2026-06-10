import { create } from 'zustand'
import type {
  AgentHandoffContext,
  AgentMessage,
  AgentMode,
  GraphPatch,
  SuggestedTemplate,
  WorkflowPlan,
} from '../types/agent'

interface AgentState {
  panelOpen: boolean
  sessionId: string | null
  messages: AgentMessage[]
  pendingPlan: WorkflowPlan | null
  pendingPlanWarnings: string[]
  pendingPatch: GraphPatch | null
  pendingPatchWarnings: string[]
  suggestedTemplates: SuggestedTemplate[]
  lastUserIntent: string
  sending: boolean
  agentModeOverride: AgentMode | null
  handoff: AgentHandoffContext | null
  setPanelOpen: (open: boolean) => void
  setSessionId: (id: string | null) => void
  setMessages: (messages: AgentMessage[]) => void
  appendMessage: (message: AgentMessage) => void
  setPendingPlan: (plan: WorkflowPlan | null, warnings?: string[]) => void
  setPendingPatch: (patch: GraphPatch | null, warnings?: string[]) => void
  setSuggestedTemplates: (templates: SuggestedTemplate[]) => void
  setLastUserIntent: (intent: string) => void
  setSending: (sending: boolean) => void
  setAgentModeOverride: (mode: AgentMode | null) => void
  setHandoff: (handoff: AgentHandoffContext | null) => void
  setHandoffCollapsed: (collapsed: boolean) => void
  reset: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  panelOpen: false,
  sessionId: null,
  messages: [],
  pendingPlan: null,
  pendingPlanWarnings: [],
  pendingPatch: null,
  pendingPatchWarnings: [],
  suggestedTemplates: [],
  lastUserIntent: '',
  sending: false,
  agentModeOverride: null,
  handoff: null,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setPendingPlan: (pendingPlan, warnings = []) =>
    set({
      pendingPlan,
      pendingPlanWarnings: warnings,
      pendingPatch: null,
      pendingPatchWarnings: [],
      suggestedTemplates: [],
    }),
  setPendingPatch: (pendingPatch, warnings = []) =>
    set({
      pendingPatch,
      pendingPatchWarnings: warnings,
      pendingPlan: null,
      pendingPlanWarnings: [],
      suggestedTemplates: [],
    }),
  setSuggestedTemplates: (suggestedTemplates) =>
    set({ suggestedTemplates, pendingPlan: null, pendingPlanWarnings: [], pendingPatch: null }),
  setLastUserIntent: (lastUserIntent) => set({ lastUserIntent }),
  setSending: (sending) => set({ sending }),
  setAgentModeOverride: (agentModeOverride) => set({ agentModeOverride }),
  setHandoff: (handoff) => set({ handoff }),
  setHandoffCollapsed: (collapsed) =>
    set((s) => (s.handoff ? { handoff: { ...s.handoff, collapsed } } : {})),
  reset: () =>
    set({
      sessionId: null,
      messages: [],
      pendingPlan: null,
      pendingPlanWarnings: [],
      pendingPatch: null,
      pendingPatchWarnings: [],
      suggestedTemplates: [],
      lastUserIntent: '',
      sending: false,
      agentModeOverride: null,
      handoff: null,
    }),
}))
