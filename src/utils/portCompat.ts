const COMPAT_MAP: Record<string, string[]> = {
  'text:prompt': ['image:prompt', 'video:prompt'],
  'image:reference': ['image:reference', 'video:firstFrame', 'video:lastFrame'],
  'image:firstFrame': ['video:firstFrame'],
  'image:lastFrame': ['video:lastFrame'],
  'video:video': ['compose:video'],
  'audio:audio': ['video:audio', 'compose:audio'],
  'script:script': ['image:prompt'],
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
