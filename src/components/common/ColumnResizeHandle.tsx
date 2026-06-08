import type { MouseEvent as ReactMouseEvent } from 'react'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

interface Props {
  value: number
  onChange: (width: number) => void
  min: number
  max: number
  ariaLabel: string
}

/** 表头列右缘竖向拖拽，调整左列像素宽度 */
export function ColumnResizeHandle({ value, onChange, min, max, ariaLabel }: Props) {
  const startDrag = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startW = value

    const onMove = (e: MouseEvent) => {
      onChange(clamp(startW + (e.clientX - startX), min, max))
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onMouseDown={startDrag}
      className="nodrag absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center hover:bg-[var(--studio-accent-muted)] group"
    >
      <span className="w-0.5 h-8 rounded-full bg-border group-hover:bg-[var(--studio-accent)]" />
    </div>
  )
}
