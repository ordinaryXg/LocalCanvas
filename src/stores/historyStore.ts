import type { Edge, Node } from '@xyflow/react'
import { MAX_HISTORY } from '../utils/constants'

export interface HistoryEntry {
  nodes: Node[]
  edges: Edge[]
}

const past: HistoryEntry[] = []
let future: HistoryEntry[] = []

function cloneEntry(entry: HistoryEntry): HistoryEntry {
  return {
    nodes: JSON.parse(JSON.stringify(entry.nodes)) as Node[],
    edges: JSON.parse(JSON.stringify(entry.edges)) as Edge[],
  }
}

export function pushHistory(entry: HistoryEntry): void {
  past.push(cloneEntry(entry))
  if (past.length > MAX_HISTORY) past.shift()
  future = []
}

export function undo(current: HistoryEntry): HistoryEntry | null {
  if (past.length === 0) return null
  const previous = past.pop()!
  future.push(cloneEntry(current))
  return previous
}

export function redo(current: HistoryEntry): HistoryEntry | null {
  if (future.length === 0) return null
  const next = future.pop()!
  past.push(cloneEntry(current))
  return next
}

export function canUndo(): boolean {
  return past.length > 0
}

export function canRedo(): boolean {
  return future.length > 0
}

export function clearHistory(): void {
  past.length = 0
  future = []
}

export function getHistorySnapshot(): HistoryEntry {
  return { nodes: [], edges: [] }
}
