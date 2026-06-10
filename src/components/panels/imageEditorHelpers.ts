export const IMAGE_RATIO_MAP: Record<string, [number, number]> = {
  '1:1': [1920, 1920],
  '16:9': [2560, 1440],
  '9:16': [1440, 2560],
  '3:4': [1920, 2560],
  '4:3': [2560, 1920],
}

export function sourceNodeLabel(type: string | undefined): string {
  if (type === 'text') return '文本'
  if (type === 'script') return '脚本'
  return '上游'
}
