export interface WorkflowPlan {
  version: 1
  intent: string
  summary: string
  nodes: PlannedNode[]
  edges: PlannedEdge[]
  executionMode: 'manual' | 'auto'
  estimatedSteps: number
  skillId?: string
}

export interface PlannedNode {
  tempId: string
  type: 'text' | 'image' | 'video' | 'audio' | 'script' | 'compose' | 'storyboard'
  label?: string
  data: Record<string, unknown>
  modelHint?: string
  position?: { x: number; y: number }
}

export interface PlannedEdge {
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  plan?: WorkflowPlan
  timestamp: string
}

export interface SuggestedTemplate {
  id: string
  name: string
  description: string
  score: number
}

export interface AgentChatResult {
  reply: string
  plan?: WorkflowPlan
  sessionId: string
  skillId?: string
  suggestedTemplates?: SuggestedTemplate[]
  planWarnings?: string[]
  error?: string
  message?: string
}

export interface AgentSessionDetail {
  id: string
  title?: string
  projectId?: string
  messages: AgentMessage[]
  lastPlan?: WorkflowPlan
  updatedAt: string
}

export interface AgentPreferences {
  version: 1
  disabledTemplateIds: string[]
  defaultMode: 'auto' | 'plan' | 'build'
  autoRunAfterConfirm: boolean
  checkpointEnabled: boolean
  defaultTrack: 'auto' | 'lite' | 'studio'
  takesPerShot: number
}

export interface AgentSessionSummary {
  id: string
  title?: string
  projectId?: string
  lastPlan?: WorkflowPlan
  updatedAt: string
}
