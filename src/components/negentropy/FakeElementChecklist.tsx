import { useState } from 'react'

export interface FakeItem {
  id: string
  label: string
  reason: string
  promptTokensToRemove: string[]
  negativeTerms: string[]
  confidence: number
}

export function FakeElementChecklist({
  items,
  onApply,
  onClose,
}: {
  items: FakeItem[]
  onApply: (selected: FakeItem[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)))

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] max-h-[60vh] bg-bg-secondary border border-border rounded-lg p-4 flex flex-col">
        <h4 className="text-sm font-medium mb-2">去掉假的</h4>
        <div className="flex-1 overflow-y-auto space-y-2 text-xs">
          {items.map((item) => (
            <label key={item.id} className="flex gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <span>
                <span className="text-text-primary">{item.label}</span>
                <span className="text-text-muted block">{item.reason}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="flex-1 py-1.5 rounded bg-violet-600 text-white text-xs"
            onClick={() => onApply(items.filter((i) => selected.has(i.id)))}
          >
            删除选中
          </button>
          <button type="button" className="px-3 py-1.5 rounded border border-border text-xs" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
