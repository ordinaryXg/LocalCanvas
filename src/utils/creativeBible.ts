import type { ProductionBrief } from '../types/agent'
import type { CreativeBibleEntry, ProjectMetadata } from '../types/project'
import { generateId } from './id'

export function emptyProjectMetadata(): ProjectMetadata {
  return { version: 1, creativeBible: [] }
}

export function normalizeProjectMetadata(raw: unknown): ProjectMetadata {
  if (!raw || typeof raw !== 'object') return emptyProjectMetadata()
  const obj = raw as ProjectMetadata
  const entries = Array.isArray(obj.creativeBible) ? obj.creativeBible : []
  return {
    version: 1,
    creativeBible: entries.filter(
      (e) => e && typeof e.name === 'string' && typeof e.visualDescription === 'string',
    ),
  }
}

export function briefToCreativeBibleEntries(brief: ProductionBrief): CreativeBibleEntry[] {
  const entries: CreativeBibleEntry[] = []
  const prefix = `${brief.tone}，${brief.aspectRatio}`
  if (/产品|demo|功能|SaaS|软件/i.test(brief.filmType + brief.mustInclude)) {
    entries.push({
      id: generateId('bible'),
      kind: 'product',
      name: brief.title.slice(0, 24) || '主产品',
      visualDescription: brief.mustInclude,
      lockedPromptPrefix: `${prefix}，产品外观一致：`,
    })
  }
  if (/叙事|故事|角色|narrative/i.test(brief.filmType + brief.mustInclude)) {
    entries.push({
      id: generateId('bible'),
      kind: 'character',
      name: '主角',
      visualDescription: brief.mustInclude,
      lockedPromptPrefix: `${prefix}，角色一致：`,
    })
  }
  if (entries.length === 0) {
    entries.push({
      id: generateId('bible'),
      kind: 'location',
      name: brief.title.slice(0, 24) || '主场景',
      visualDescription: `${brief.tone} · ${brief.mustInclude}`,
      lockedPromptPrefix: `${prefix}，`,
    })
  }
  return entries
}

export function mergeCreativeBibleEntries(
  existing: CreativeBibleEntry[] | undefined,
  incoming: CreativeBibleEntry[],
): CreativeBibleEntry[] {
  const map = new Map<string, CreativeBibleEntry>()
  for (const e of existing ?? []) map.set(`${e.kind}:${e.name}`, e)
  for (const e of incoming) map.set(`${e.kind}:${e.name}`, e)
  return [...map.values()]
}

export function buildCreativeBiblePromptPrefix(entries: CreativeBibleEntry[] | undefined): string {
  if (!entries?.length) return ''
  const parts = entries
    .map((e) => e.lockedPromptPrefix?.trim() || `${e.name}：${e.visualDescription}`)
    .filter(Boolean)
  if (parts.length === 0) return ''
  return `[创意圣经] ${parts.join(' | ')} `
}

export function injectCreativeBibleIntoPrompt(
  prompt: string,
  entries: CreativeBibleEntry[] | undefined,
): string {
  const prefix = buildCreativeBiblePromptPrefix(entries)
  if (!prefix || prompt.startsWith('[创意圣经]')) return prompt
  return `${prefix}${prompt}`
}
