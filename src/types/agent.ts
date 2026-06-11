export type WorkflowExecutionMode = 'manual' | 'auto' | 'checkpoint'

export type ProductionTrack = 'lite' | 'studio'

export type ShotProductionMode = 'i2v' | 't2v' | 'flf' | 'ref-sheet'

export type StudioTemplateId =
  | 'brand-spot-30s'
  | 'narrative-short'
  | 'product-demo'
  | 'montage-broll'

export type ProductionExpansion = 'skeleton' | 'per-shot' | 'full'

export interface ProductionBrief {
  title: string
  filmType: string
  targetDurationSec: number
  aspectRatio: string
  tone: string
  mustInclude: string
  track?: ProductionTrack
}

export interface ShotSpec {
  sequence: number
  id?: string
  beat?: string
  sceneId?: string
  description: string
  prompt: string
  durationSec: number
  camera: string
  productionMode?: ShotProductionMode
  dialogue?: string
  vo?: string
}

export interface ScriptProductionMeta {
  brief?: ProductionBrief
  shots?: Array<{
    sequence: number
    beat?: string
    sceneId?: string
    mode?: ShotProductionMode
  }>
  appliedFrom?: { productionPlanId?: string; templateId?: string; at: string }
}

export interface DurationBudgetResult {
  ok: boolean
  targetSec: number
  sumSec: number
  deltaSec: number
  level: 'ok' | 'warn' | 'block'
}

export interface ProductionPlan {
  version: 1
  intent: string
  summary: string
  templateId: StudioTemplateId | string
  track: 'studio'
  brief: ProductionBrief
  shots: ShotSpec[]
  workflow: WorkflowPlan
  executionMode: 'checkpoint'
  checkpointAfter?: Array<'script' | 'storyboard'>
  estimatedSteps: number
  durationBudget: DurationBudgetResult
  expansion?: ProductionExpansion
  takesPerShot?: number
  /** 叙事片：展开子图 DAG 在每个 scene 末暂停 */
  sceneCheckpoints?: boolean
}

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
  planWarnings?: string[]
  productionPlan?: ProductionPlan
  patch?: GraphPatch
  patchWarnings?: string[]
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
  productionPlan?: ProductionPlan
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
  lastProductionPlan?: ProductionPlan
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
  lastProductionPlan?: ProductionPlan
  updatedAt: string
}
