import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'

interface PortDef {
  id: string
  label?: string
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
}: BaseNodeProps) {
  return (
    <div
      className="rounded-lg border-2 bg-bg-secondary shadow-lg transition-shadow duration-200"
      style={{
        borderColor: selected ? color : 'var(--color-border)',
        minWidth: width ?? 200,
        boxShadow: selected ? `0 0 20px ${color}40` : undefined,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
        <span>{title}</span>
      </div>

      <div className="px-3 py-2 relative">{children}</div>

      {inputs.map((input, i) => (
        <Handle
          key={`in-${input.id}`}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{
            top: `${30 + i * 18}%`,
            background: color,
            width: 10,
            height: 10,
          }}
        />
      ))}

      {outputs.map((output, i) => (
        <Handle
          key={`out-${output.id}`}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{
            top: `${30 + i * 18}%`,
            background: color,
            width: 10,
            height: 10,
          }}
        />
      ))}
    </div>
  )
}
