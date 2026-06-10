export type TextGenerateResult = string | { content: string; reasoningContent?: string }

export function normalizeTextGenerateResult(
  raw: TextGenerateResult,
): { content: string; reasoningContent?: string } {
  if (typeof raw === 'string') return { content: raw }
  return raw
}
