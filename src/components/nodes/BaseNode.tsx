import { NodeResizer } from '@xyflow/react'
import type { ReactNode } from 'react'
import { PortHandle } from './PortHandle'

interface PortDef {
  id: string
  top?: string
}

interface BaseNodeProps {
  color: string
  icon: ReactNode
  title: string
  children: ReactNode
  inputs?: PortDef[]
  outputs?: PortDef[]
  selected?: boolean
  width?: number
  height?: number
  defaultWidth?: number
  resizable?: boolean
  minWidth?: number
  minHeight?: number
}

function portTop(index: number, explicit?: string): string {
  return explicit ?? `${30 + index * 18}%`
}

export function BaseNode({
  color,
  icon,
  title,
  children,
  inputs = [],
  outputs = [],
  selected,
  width,
  height,
  defaultWidth = 220,
  resizable = true,
  minWidth = 180,
  minHeight = 80,
}: BaseNodeProps) {
  const boxWidth = width ?? defaultWidth

  return (
    <>
      {resizable && (
        <NodeResizer
          isVisible={!!selected}
          minWidth={minWidth}
          minHeight={minHeight}
          lineClassName="border-accent"
          handleClassName="h-2 w-2 bg-accent border border-white rounded-sm"
        />
      )}
      <div
        className="rounded-lg border-2 bg-bg-secondary shadow-lg transition-shadow duration-200 relative"
        style={{
          borderColor: selected ? color : 'var(--color-border)',
          width: boxWidth,
          maxWidth: boxWidth,
          minWidth,
          height: height ? `${height}px` : undefined,
          minHeight,
          overflow: 'visible',
          boxShadow: selected ? `0 0 20px ${color}40` : undefined,
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium text-white overflow-hidden"
          style={{ backgroundColor: color }}
        >
          {icon}
          <span className="truncate">{title}</span>
        </div>

        <div className="px-3 py-2 relative overflow-hidden">{children}</div>

        {inputs.map((input, i) => (
          <PortHandle
            key={`in-${input.id}`}
            id={input.id}
            type="target"
            color={color}
            top={portTop(i, input.top)}
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
