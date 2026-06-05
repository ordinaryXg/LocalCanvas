import { useEffect } from 'react'

interface ImagePreviewProps {
  src: string
  title?: string
  onClose: () => void
}

export function ImagePreview({ src, title, onClose }: ImagePreviewProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92"
      role="dialog"
      aria-modal
      aria-label="图片预览"
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/10">
        <span className="text-sm text-white/90 truncate">{title ?? '图片预览'}</span>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
          aria-label="关闭预览"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-auto">
        <img
          src={src}
          alt={title ?? ''}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  )
}
