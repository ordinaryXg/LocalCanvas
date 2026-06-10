export type WorkflowExecutionMode = 'manual' | 'auto' | 'checkpoint'

export interface WorkflowPlan {
  version: 1
  intent: string
  summary: string
  nodes: PlannedNode[]
  edges: PlannedEdge[]
  executionMode: WorkflowExecutionMode
  estimatedSteps: number
  skillId?: string
  checkpointAfter?: Array<'script' | 'storyboard'>
}

export interface GraphPatch {
  version: 1
  intent: string
  summary: string
  anchorNodeIds: string[]
  addNodes?: PlannedNode[]
  addEdges?: PlannedEdge[]
  removeNodeIds?: string[]
  removeEdgeIds?: string[]
  updateNodes?: Array<{ nodeId: string; data: Record<string, unknown> }>
  executionMode?: 'none' | 'auto' | 'checkpoint'
}

export type AgentMode = 'plan' | 'build'

export type HandoffStep = 'script' | 'storyboard' | 'video' | 'compose'

export interface AgentHandoffContext {
  step: HandoffStep
  scriptNodeId?: string
  storyboardNodeId?: string
  composeNodeId?: string
  collapsed: boolean
}

export interface CanvasNodeSnapshot {
  id: string
  type: string
  label?: string
  data: Record<string, unknown>
}

export interface CanvasEdgeSnapshot {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
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
  patch?: GraphPatch
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
