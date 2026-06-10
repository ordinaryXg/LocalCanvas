import { Handle, Position } from '@xyflow/react'
import { getPortHint, getPortIcon } from './portMeta'

interface PortHandleProps {
  id: string
  type: 'source' | 'target'
  color: string
  /** 垂直位置，如 '28%' */
  top: string
  disabled?: boolean
  slotLabel?: string
}

export function PortHandle({ id, type, color, top, disabled, slotLabel }: PortHandleProps) {
  const isInput = type === 'target'
  const icon = getPortIcon(id)
  const hint = getPortHint(id, type)
  const isCharIcon = icon.length === 1 && icon.charCodeAt(0) > 127

  return (
    <>
      <Handle
        type={type}
        position={isInput ? Position.Left : Position.Right}
        id={id}
        isConnectable={disabled ? false : isInput ? 1 : undefined}
        title={hint}
        style={{
          top,
          background: disabled ? 'var(--token-text-muted)' : color,
          width: 10,
          height: 10,
          border: '2px solid var(--token-surface-primary, #1a1a1a)',
          opacity: disabled ? 0.45 : 1,
        }}
      />
      {isInput && (
        <div
          className="absolute z-10 flex items-center gap-0.5 pointer-events-none left-2.5"
          style={{ top, transform: 'translateY(-50%)' }}
          title={hint}
        >
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded border border-border/80 bg-bg-primary/95 px-0.5 shadow-sm ${
              isCharIcon ? 'text-[9px] font-medium text-text-primary' : 'text-[10px] leading-none'
            }`}
            aria-label={hint}
          >
            {icon}
          </span>
          {slotLabel && (
            <span className="text-[8px] font-mono text-text-muted tabular-nums">{slotLabel}</span>
          )}
        </div>
      )}
    </>
  )
}
