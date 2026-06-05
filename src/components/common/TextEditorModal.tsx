import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

interface TextEditorModalProps {
  title: string
  value: string
  placeholder?: string
  readOnly?: boolean
  onClose: () => void
  onSave: (value: string) => void
}

const MIN_MODAL_HEIGHT = 320
const DEFAULT_MODAL_HEIGHT = 520
const MAX_MODAL_HEIGHT_RATIO = 0.9

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
  const [modalHeight, setModalHeight] = useState(DEFAULT_MODAL_HEIGHT)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    textareaRef.current?.focus()
    const len = textareaRef.current?.value.length ?? 0
    textareaRef.current?.setSelectionRange(len, len)
  }, [])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = event.clientY - resizeRef.current.startY
      const maxHeight = window.innerHeight * MAX_MODAL_HEIGHT_RATIO
      const next = Math.min(
        maxHeight,
        Math.max(MIN_MODAL_HEIGHT, resizeRef.current.startHeight + delta),
      )
      setModalHeight(next)
    }

    const onMouseUp = () => {
      resizeRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
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

  const startResize = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = { startY: event.clientY, startHeight: modalHeight }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={saveAndClose}
    >
      <div
        className="w-full max-w-3xl flex flex-col bg-bg-secondary rounded-xl border border-border shadow-2xl overflow-hidden"
        style={{ height: modalHeight, maxHeight: '90vh' }}
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
          className="flex-1 min-h-0 mx-4 mt-3 mb-2 p-3 bg-bg-tertiary text-text-primary text-sm leading-relaxed rounded-lg outline-none border border-border focus:border-accent resize-none nodrag nowheel lc-scroll-text"
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

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="调整编辑器高度"
          title="拖动调整高度"
          onMouseDown={startResize}
          className="group h-2 shrink-0 cursor-ns-resize flex items-center justify-center border-t border-transparent hover:border-accent/30 hover:bg-accent/5"
        >
          <span className="w-12 h-1 rounded-full bg-border group-hover:bg-accent/60 transition-colors" />
        </div>
      </div>
    </div>
  )
}
