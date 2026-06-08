import { useEffect, useState } from 'react'
import { filterSlashCommands, type SlashCommand } from '../../utils/slashCommands'

interface SlashCommandPaletteProps {
  open: boolean
  query: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  position: { x: number; y: number }
}

export function SlashCommandPalette({ open, query, onSelect, onClose, position }: SlashCommandPaletteProps) {
  const [highlight, setHighlight] = useState(0)
  const commands = filterSlashCommands(query)

  useEffect(() => {
    setHighlight(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (e.button === 2) return
      onClose()
    }
    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousedown', close)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, commands.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
      }
      if (e.key === 'Enter' && commands[highlight]) {
        e.preventDefault()
        onSelect(commands[highlight])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, commands, highlight, onSelect, onClose])

  if (!open) return null

  return (
    <div
      className="fixed z-[60] bg-bg-secondary border border-border rounded-lg shadow-xl py-1 min-w-[240px] max-h-[200px] overflow-y-auto"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {commands.length === 0 ? (
        <div className="px-3 py-2 text-xs text-text-muted">无匹配命令</div>
      ) : (
        commands.map((cmd, i) => (
          <button
            key={cmd.id}
            type="button"
            className={`w-full text-left px-3 py-2 ${i === highlight ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary'}`}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => onSelect(cmd)}
          >
            <div className="text-xs text-accent font-mono">{cmd.command}</div>
            <div className="text-[10px] text-text-muted">{cmd.description}</div>
          </button>
        ))
      )}
    </div>
  )
}
