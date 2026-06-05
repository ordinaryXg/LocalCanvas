import type { FakeItem } from '../components/negentropy/FakeElementChecklist'

export function applyNegentropy(
  prompt: string,
  negativePrompt: string,
  selected: FakeItem[],
): { prompt: string; negativePrompt: string } {
  let nextPrompt = prompt
  const negParts = negativePrompt ? negativePrompt.split(',').map((s) => s.trim()) : []
  for (const item of selected) {
    for (const token of item.promptTokensToRemove) {
      nextPrompt = nextPrompt.replace(new RegExp(token, 'gi'), '').replace(/\s+/g, ' ').trim()
    }
    negParts.push(...item.negativeTerms)
  }
  const uniqueNeg = [...new Set(negParts.filter(Boolean))]
  return {
    prompt: nextPrompt,
    negativePrompt: uniqueNeg.join(', '),
  }
}
