export const TEXT_EDITOR_SPLIT_MIN = 0.22
export const TEXT_EDITOR_SPLIT_MAX = 0.78
export const TEXT_EDITOR_DEFAULT_SPLIT = 0.5

export function textEditorCountStats(text: string): string {
  const chars = text.length
  const lines = text ? text.split('\n').length : 0
  return `${chars.toLocaleString()} 字 · ${lines} 行`
}
