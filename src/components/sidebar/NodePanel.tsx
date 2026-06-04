import { NODE_TYPE_META } from '../../types/node'

export function NodePanel() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/localcanvas-node', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-[10px] text-text-muted mb-2">拖拽到画布创建节点</p>
      {NODE_TYPE_META.map((nt) => (
        <div
          key={nt.type}
          draggable
          onDragStart={(e) => onDragStart(e, nt.type)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary border border-border cursor-grab hover:border-accent transition text-xs text-text-primary"
        >
          <span>{nt.icon}</span>
          <span>{nt.label}</span>
        </div>
      ))}
    </div>
  )
}
