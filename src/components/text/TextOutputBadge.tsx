import type { TextOutputMode } from '../../types/node'

interface Props {
  mode: TextOutputMode
  edited?: boolean
}

export function TextOutputBadge({ mode, edited }: Props) {
  if (mode === 'generated') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-accent">
        ✨ AI 结果{edited ? ' · 已编辑' : ''}
      </span>
    )
  }
  return <span className="text-[10px] text-text-muted">直接输出</span>
}
