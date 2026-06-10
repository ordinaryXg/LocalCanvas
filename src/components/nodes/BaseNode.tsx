import { NodeResizer } from '@xyflow/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { PortHandle } from './PortHandle'

interface PortDef {
  id: string
  top?: string
  disabled?: boolean
}

interface BaseNodeProps {
  nodeId?: string
  color: string
  icon: ReactNode
  title: string
  badge?: string
  children: ReactNode
  inputs?: PortDef[]
  outputs?: PortDef[]
  selected?: boolean
  width?: number
  height?: number
  defaultWidth?: number
  resizable?: boolean
  autoSize?: boolean
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

const HEADER_HEIGHT = 32

function portTop(index: number, explicit?: string): string {
  return explicit ?? `${30 + index * 18}%`
}

export function BaseNode({
  nodeId,
  color,
  icon,
  title,
  badge,
  children,
  inputs = [],
  outputs = [],
  selected,
  width,
  height,
  defaultWidth = 220,
  resizable = true,
  autoSize = false,
  minWidth = 180,
  minHeight = 80,
  maxWidth,
  maxHeight,
}: BaseNodeProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const boxWidth = Math.max(minWidth, width ?? defaultWidth)
  const boxHeight = Math.max(minHeight, height ?? minHeight)

  useEffect(() => {
    if (!autoSize || !nodeId || !cardRef.current) return

    const el = cardRef.current
    let rafId = 0

    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredHeight = Math.max(minHeight, el.offsetHeight)
        const measuredWidth = Math.max(minWidth, Math.round(el.offsetWidth))
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredHeight - lastH) < 2 && Math.abs(measuredWidth - lastW) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(nodeId, measuredWidth, measuredHeight)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [autoSize, nodeId, minHeight, minWidth, updateNodeSize])

  return (
    <>
      {resizable && (
        <NodeResizer
          isVisible={!!selected}
          minWidth={minWidth}
          minHeight={minHeight}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          lineClassName="border-accent"
          handleClassName="h-2 w-2 bg-accent border border-white rounded-sm"
        />
      )}
      <div
        ref={cardRef}
        className="rounded-lg border-2 bg-bg-secondary shadow-lg transition-shadow duration-200 relative flex flex-col box-border"
        style={{
          borderColor: selected ? color : 'var(--token-border)',
          width: boxWidth,
          height: autoSize ? undefined : boxHeight,
          minWidth,
          minHeight: autoSize ? minHeight : undefined,
          overflow: 'hidden',
          boxShadow: selected ? `0 0 20px ${color}40` : undefined,
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium text-white overflow-hidden shrink-0"
          style={{ backgroundColor: color, height: HEADER_HEIGHT }}
        >
          {icon}
          <span className="truncate flex-1" title={title}>
            {title}
          </span>
          {badge && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-normal truncate max-w-[72px]">
              {badge}
            </span>
          )}
        </div>

        <div
          className={
            autoSize
              ? 'px-3 py-2 relative nodrag nowheel flex flex-col min-h-0'
              : 'px-3 py-2 relative flex flex-col flex-1 min-h-0 overflow-hidden nodrag nowheel'
          }
        >
          {children}
        </div>

        {inputs.map((input, i) => (
          <PortHandle
            key={`in-${input.id}`}
            id={input.id}
            type="target"
            color={color}
            top={portTop(i, input.top)}
            disabled={input.disabled}
            slotLabel={input.slotLabel}
          />
        ))}

        {outputs.map((output, i) => (
          <PortHandle
            key={`out-${output.id}`}
            id={output.id}
            type="source"
            color={color}
            top={portTop(i, output.top)}
          />
        ))}
      </div>
    </>
  )
}
