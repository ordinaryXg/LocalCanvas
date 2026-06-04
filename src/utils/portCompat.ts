import type { Edge } from '@xyflow/react'

const COMPAT_MAP: Record<string, string[]> = {
  'text:prompt': ['image:prompt', 'video:prompt'],
  'image:reference': ['image:reference', 'video:firstFrame', 'video:lastFrame'],
  'image:firstFrame': ['video:firstFrame'],
  'image:lastFrame': ['video:lastFrame'],
  'video:video': ['compose:video'],
  'audio:audio': ['video:audio', 'compose:audio'],
  'script:script': ['image:prompt', 'video:prompt'],
}

export function isPortCompatible(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
  targetType: string | undefined,
  targetHandle: string | null | undefined,
): boolean {
  if (!sourceHandle || !targetHandle || !sourceType || !targetType) return false
  const key = `${sourceType}:${sourceHandle}`
  const allowed = COMPAT_MAP[key]
  if (!allowed) return false
  return allowed.includes(`${targetType}:${targetHandle}`)
}

export function getNodeTypeFromId(
  nodes: Array<{ id: string; type?: string }>,
  nodeId: string,
): string | undefined {
  return nodes.find((n) => n.id === nodeId)?.type
}

/** 每个目标输入端口只允许一条入线（避免 dataFlow 多源冲突） */
const SINGLE_INPUT_HANDLES = new Set([
  'prompt',
  'reference',
  'firstFrame',
  'lastFrame',
  'audio',
])

export function isTargetHandleAvailable(
  edges: Edge[],
  targetId: string,
  targetHandle: string | null | undefined,
): boolean {
  if (!targetHandle || !SINGLE_INPUT_HANDLES.has(targetHandle)) return true
  return !edges.some((e) => e.target === targetId && e.targetHandle === targetHandle)
}
