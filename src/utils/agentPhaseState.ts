import type { Node } from '@xyflow/react'
import type { AgentHandoffContext } from '../types/agent'

export type PhaseId = 'brief' | 'shots' | 'script' | 'storyboard' | 'compose'

export type PhaseStatus = 'done' | 'active' | 'pending' | 'waiting'

export interface PhaseRailItem {
  id: PhaseId
  labelKey: string
  status: PhaseStatus
}

export function computePhaseRail(params: {
  briefConfirmed: boolean
  hasShotPreview: boolean
  handoff: AgentHandoffContext | null
  nodes: Node[]
}): PhaseRailItem[] {
  const hasScript = params.nodes.some((n) => n.type === 'script')
  const hasStoryboard = params.nodes.some((n) => n.type === 'storyboard')
  const hasCompose = params.nodes.some((n) => n.type === 'compose')
  const scriptRows = params.nodes.find((n) => n.type === 'script')?.data?.scriptRows as
    | unknown[]
    | undefined
  const frames = params.nodes.find((n) => n.type === 'storyboard')?.data?.frames as
    | unknown[]
    | undefined

  const briefStatus: PhaseStatus = params.briefConfirmed ? 'done' : 'active'
  const shotsStatus: PhaseStatus = params.briefConfirmed
    ? params.hasShotPreview
      ? 'done'
      : 'active'
    : 'pending'
  const scriptStatus: PhaseStatus = hasScript
    ? scriptRows && scriptRows.length > 0
      ? 'done'
      : params.handoff?.step === 'script'
        ? 'active'
        : 'waiting'
    : params.handoff
      ? 'active'
      : 'pending'
  const storyboardStatus: PhaseStatus = hasStoryboard
    ? frames && frames.length > 0
      ? 'done'
      : 'waiting'
    : 'pending'
  const composeStatus: PhaseStatus = hasCompose ? 'waiting' : 'pending'

  return [
    { id: 'brief', labelKey: 'agent.phase.brief', status: briefStatus },
    { id: 'shots', labelKey: 'agent.phase.shots', status: shotsStatus },
    { id: 'script', labelKey: 'agent.phase.script', status: scriptStatus },
    { id: 'storyboard', labelKey: 'agent.phase.storyboard', status: storyboardStatus },
    { id: 'compose', labelKey: 'agent.phase.compose', status: composeStatus },
  ]
}
