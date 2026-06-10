import type { ComposeClipItem } from '../../types/node'

interface ComposeClipContextMenuProps {
  x: number
  y: number
  clipId: string
  isExcluded: boolean
  onInclude: () => void
  onExclude: () => void
  onDisconnect: () => void
}

export function ComposeClipContextMenu({
  x,
  y,
  clipId,
  isExcluded,
  onInclude,
  onExclude,
  onDisconnect,
}: ComposeClipContextMenuProps) {
  return (
    <div
      className="fixed z-[60] bg-bg-secondary border border-border rounded shadow-lg py-1 text-xs min-w-[140px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {isExcluded ? (
        <button
          type="button"
          className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary"
          onClick={onInclude}
        >
          恢复至成片
        </button>
      ) : (
        <button
          type="button"
          className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary"
          onClick={onExclude}
        >
          从成片排除
        </button>
      )}
      <button
        type="button"
        className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary text-danger"
        onClick={onDisconnect}
      >
        断开连线
      </button>
    </div>
  )
}
