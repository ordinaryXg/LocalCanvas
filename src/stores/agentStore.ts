import { create } from 'zustand'
import type {
  AgentHandoffContext,
  AgentMessage,
  AgentMode,
  GraphPatch,
  ProductionPlan,
  SuggestedTemplate,
  WorkflowPlan,
} from '../types/agent'

interface AgentState {
  panelOpen: boolean
  sessionId: string | null
  messages: AgentMessage[]
  pendingPlan: WorkflowPlan | null
  pendingPlanWarnings: string[]
  pendingProductionPlan: ProductionPlan | null
  pendingPatch: GraphPatch | null
  pendingPatchWarnings: string[]
  suggestedTemplates: SuggestedTemplate[]
  lastUserIntent: string
  sending: boolean
  agentModeOverride: AgentMode | null
  buildFocusedNodeIds: string[]
  handoff: AgentHandoffContext | null
  lastAppliedProductionPlan: ProductionPlan | null
  setPanelOpen: (open: boolean) => void
  setSessionId: (id: string | null) => void
  setMessages: (messages: AgentMessage[]) => void
  appendMessage: (message: AgentMessage) => void
  setPendingPlan: (plan: WorkflowPlan | null, warnings?: string[]) => void
  setPendingProductionPlan: (plan: ProductionPlan | null, warnings?: string[]) => void
  setPendingPatch: (patch: GraphPatch | null, warnings?: string[]) => void
  setSuggestedTemplates: (templates: SuggestedTemplate[]) => void
  setLastUserIntent: (intent: string) => void
  setSending: (sending: boolean) => void
  setAgentModeOverride: (mode: AgentMode | null) => void
  setBuildFocusedNodeIds: (ids: string[]) => void
  setHandoff: (handoff: AgentHandoffContext | null) => void
  setHandoffCollapsed: (collapsed: boolean) => void
  setLastAppliedProductionPlan: (plan: ProductionPlan | null) => void
  reset: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  panelOpen: false,
  sessionId: null,
  messages: [],
  pendingPlan: null,
  pendingPlanWarnings: [],
  pendingProductionPlan: null,
  pendingPatch: null,
  pendingPatchWarnings: [],
  suggestedTemplates: [],
  lastUserIntent: '',
  sending: false,
  agentModeOverride: null,
  buildFocusedNodeIds: [],
  handoff: null,
  lastAppliedProductionPlan: null,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setPendingPlan: (pendingPlan, warnings = []) =>
    set({
      pendingPlan,
      pendingPlanWarnings: warnings,
      pendingProductionPlan: null,
      pendingPatch: null,
      pendingPatchWarnings: [],
      suggestedTemplates: [],
    }),
  setPendingProductionPlan: (pendingProductionPlan, warnings = []) =>
    set({
      pendingProductionPlan,
      pendingPlan: pendingProductionPlan?.workflow ?? null,
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
      pendingProductionPlan: null,
      suggestedTemplates: [],
    }),
  setSuggestedTemplates: (suggestedTemplates) =>
    set({
      suggestedTemplates,
      pendingPlan: null,
      pendingPlanWarnings: [],
      pendingProductionPlan: null,
      pendingPatch: null,
    }),
  setLastUserIntent: (lastUserIntent) => set({ lastUserIntent }),
  setSending: (sending) => set({ sending }),
  setAgentModeOverride: (agentModeOverride) => set({ agentModeOverride }),
  setBuildFocusedNodeIds: (buildFocusedNodeIds) => set({ buildFocusedNodeIds }),
  setHandoff: (handoff) => set({ handoff }),
  setHandoffCollapsed: (collapsed) =>
    set((s) => (s.handoff ? { handoff: { ...s.handoff, collapsed } } : {})),
  setLastAppliedProductionPlan: (lastAppliedProductionPlan) => set({ lastAppliedProductionPlan }),
  reset: () =>
    set({
      sessionId: null,
      messages: [],
      pendingPlan: null,
      pendingPlanWarnings: [],
      pendingProductionPlan: null,
      pendingPatch: null,
      pendingPatchWarnings: [],
      suggestedTemplates: [],
      lastUserIntent: '',
      sending: false,
      agentModeOverride: null,
      buildFocusedNodeIds: [],
      handoff: null,
      lastAppliedProductionPlan: null,
    }),
}))
