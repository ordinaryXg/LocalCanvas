export type DagNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface DagRunNodeState {
  nodeId: string
  status: DagNodeStatus
  error?: string
}

export interface DagRunState {
  dagRunId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  nodeStates: DagRunNodeState[]
  completedCount: number
  totalCount: number
}
