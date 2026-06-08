import type { TextNodeData, TextOutputMode } from '../types/node'

/** 读取文本节点连线下游的内容（单一来源：output，迁移期兼容旧字段） */
export function textNodeOutput(data: Record<string, unknown>): string {
  const mode = (data.outputMode as TextOutputMode | undefined) ?? 'passthrough'
  const draft = typeof data.draft === 'string' ? data.draft : ''
  const outputEdited = data.outputEdited === true

  if (mode === 'passthrough' && !outputEdited && draft.trim()) {
    return draft
  }

  const output = typeof data.output === 'string' ? data.output : undefined
  if (output?.trim()) return output

  const legacy =
    (typeof data.generatedContent === 'string' ? data.generatedContent : undefined) ??
    (typeof data.inputContent === 'string' ? data.inputContent : undefined) ??
    (typeof data.content === 'string' ? data.content : undefined) ??
    (typeof data.draft === 'string' ? data.draft : undefined) ??
    ''
  return legacy
}

/** @deprecated 使用 textNodeOutput */

export function inferOutputMode(
  draft: string,
  generated: string,
  input: string,
): TextOutputMode {
  if (generated.trim() && generated !== input && generated !== draft) {
    return 'generated'
  }
  return 'passthrough'
}

/** 将旧版 text 节点 data 规范为新结构（加载项目时调用） */
export function normalizeTextNodeData(data: Record<string, unknown>): TextNodeData {
  const inputContent = (data.inputContent as string) ?? ''
  const generatedContent =
    (data.generatedContent as string) ??
    (typeof data.content === 'string' ? data.content : '') ??
    ''
  const legacyPrompt = (data.prompt as string) ?? ''

  const draft =
    (data.draft as string) ||
    inputContent ||
    (generatedContent && !inputContent ? '' : legacyPrompt) ||
    ''

  let output = (data.output as string) ?? ''
  if (!output.trim()) {
    if (generatedContent.trim()) output = generatedContent
    else if (inputContent.trim()) output = inputContent
    else if (legacyPrompt.trim()) output = legacyPrompt
    else if (draft.trim()) output = draft
  }

  const outputMode =
    (data.outputMode as TextOutputMode | undefined) ??
    inferOutputMode(draft, generatedContent, inputContent)

  const modelId =
    (data.modelId as string) || (data.llmModel as string) || undefined

  return {
    title: (data.title as string) || '文本',
    draft,
    output,
    outputMode,
    outputEdited: (data.outputEdited as boolean) ?? false,
    systemPrompt: (data.systemPrompt as string) || undefined,
    modelId,
    isGenerating: (data.isGenerating as boolean) ?? false,
  }
}

export function normalizeTextNodes(nodes: Array<{ type?: string; data: Record<string, unknown> }>) {
  return nodes.map((node) => {
    if (node.type !== 'text') return node
    return { ...node, data: normalizeTextNodeData(node.data) }
  })
}

export function previewLines(text: string, maxLines = 3): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  return lines.slice(0, maxLines).join('\n') + '…'
}

export function textCharStats(text: string): string {
  if (!text) return '0 字'
  if (text.length < 1000) return `${text.length} 字`
  return `${(text.length / 1000).toFixed(1)}k 字`
}
