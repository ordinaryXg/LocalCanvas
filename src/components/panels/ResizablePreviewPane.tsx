import { useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

interface Props {
  height: number
  onHeightChange: (height: number) => void
  minHeight?: number
  maxHeight?: number
  width: number
  children: ReactNode
  className?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function ResizablePreviewPane({
  height,
  onHeightChange,
  minHeight = 120,
  maxHeight = 560,
  width,
  children,
  className = '',
}: Props) {
  const paneRef = useRef<HTMLDivElement>(null)

  const startHeightDrag = (event: ReactMouseEvent) => {
    event.preventDefault()
    const startY = event.clientY
    const startH = height

    const onMove = (e: MouseEvent) => {
      const next = clamp(startH + (e.clientY - startY), minHeight, maxHeight)
      if (paneRef.current) paneRef.current.style.height = `${next}px`
    }

    const onUp = (e: MouseEvent) => {
      const next = clamp(startH + (e.clientY - startY), minHeight, maxHeight)
      onHeightChange(next)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={paneRef}
      className={`relative flex flex-col shrink-0 ${className}`}
      style={{ height, width, minHeight, maxHeight, minWidth: width, maxWidth: width }}
    >
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整预览高度"
        onMouseDown={startHeightDrag}
        className="shrink-0 h-2.5 cursor-ns-resize flex items-center justify-center hover:bg-[var(--studio-accent-muted)] group border-t border-border/50"
      >
        <span className="w-10 h-1 rounded-full bg-border group-hover:bg-[var(--studio-accent)]" />
      </div>
    </div>
  )
}

interface SplitterProps {
  onWidthChange: (width: number) => void
  onWidthPreview?: (width: number) => void
  currentWidth: number
  minWidth: number
  maxWidth: number
  height: number
}

/** 预览列与参数列之间的竖向拖拽条 */
export function PreviewWidthSplitter({
  onWidthChange,
  onWidthPreview,
  currentWidth,
  minWidth,
  maxWidth,
  height,
}: SplitterProps) {
  const startWidthDrag = (event: ReactMouseEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startW = currentWidth

    const onMove = (e: MouseEvent) => {
      const next = clamp(startW + (e.clientX - startX), minWidth, maxWidth)
      onWidthPreview?.(next)
    }

    const onUp = (e: MouseEvent) => {
      const next = clamp(startW + (e.clientX - startX), minWidth, maxWidth)
      onWidthChange(next)
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
      aria-label="调整预览宽度"
      onMouseDown={startWidthDrag}
      className="shrink-0 w-3 cursor-ew-resize flex items-center justify-center hover:bg-[var(--studio-accent-muted)] group self-start"
      style={{ height }}
    >
      <span className="w-1 h-12 rounded-full bg-border group-hover:bg-[var(--studio-accent)]" />
    </div>
  )
}
