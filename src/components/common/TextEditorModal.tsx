import { useEffect, useRef, useState } from 'react'

interface TextEditorModalProps {
  title: string
  value: string
  placeholder?: string
  readOnly?: boolean
  onClose: () => void
  onSave: (value: string) => void
}

function textStats(text: string): { chars: number; lines: number } {
  return {
    chars: text.length,
    lines: text ? text.split('\n').length : 0,
  }
}

export function TextEditorModal({
  title,
  value,
  placeholder,
  readOnly,
  onClose,
  onSave,
}: TextEditorModalProps) {
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    textareaRef.current?.focus()
    const len = textareaRef.current?.value.length ?? 0
    textareaRef.current?.setSelectionRange(len, len)
  }, [])

  const stats = textStats(draft)
  const dirty = draft !== value

  const saveAndClose = () => {
    if (dirty && !readOnly) {
      onSave(draft)
    }
    onClose()
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        saveAndClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draft, value, readOnly, onSave, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={saveAndClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-bg-secondary rounded-xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-medium text-text-primary">{title}</h2>
            <p className="text-[10px] text-text-muted mt-0.5">
              {stats.chars.toLocaleString()} 字 · {stats.lines} 行
              {readOnly ? ' · 只读' : ' · Esc 关闭并保存'}
            </p>
          </div>
          <button
            type="button"
            onClick={saveAndClose}
            className="w-8 h-8 rounded-full text-text-muted hover:text-white hover:bg-bg-tertiary flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className="flex-1 min-h-[50vh] m-4 mt-3 p-3 bg-bg-tertiary text-text-primary text-sm leading-relaxed rounded-lg outline-none border border-border focus:border-accent resize-none nodrag nowheel"
        />

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-white rounded"
          >
            取消
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                onSave(draft)
                onClose()
              }}
              className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover"
            >
              保存
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
