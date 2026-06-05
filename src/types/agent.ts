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

export interface AgentChatResult {
  reply: string
  plan?: WorkflowPlan
  sessionId: string
  skillId?: string
  error?: string
  message?: string
}

export interface AgentSessionSummary {
  id: string
  title?: string
  projectId?: string
  lastPlan?: WorkflowPlan
  updatedAt: string
}
