import { v4 as uuidv4 } from 'uuid'

export function generateId(prefix = 'node'): string {
  return `${prefix}-${uuidv4()}`
}

export function generateNodeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
