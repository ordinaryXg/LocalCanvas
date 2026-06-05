import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface ResizableTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number
  maxHeight?: number
}

export const ResizableTextarea = forwardRef<HTMLTextAreaElement, ResizableTextareaProps>(
  function ResizableTextarea(
    { className = '', minHeight = 140, maxHeight = 320, style, ...props },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        {...props}
        style={{ minHeight, maxHeight, ...style }}
        className={`w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded resize-y outline-none border border-border focus:border-accent leading-relaxed lc-scroll-text ${className}`}
      />
    )
  },
)
