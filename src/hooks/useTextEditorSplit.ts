import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import {
  TEXT_EDITOR_DEFAULT_SPLIT,
  TEXT_EDITOR_SPLIT_MAX,
  TEXT_EDITOR_SPLIT_MIN,
} from '../components/text/textEditorHelpers'

export function useTextEditorSplit(nodeId: string) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const splitDragRef = useRef<{ startX: number; startRatio: number } | null>(null)
  const [splitRatio, setSplitRatio] = useState(TEXT_EDITOR_DEFAULT_SPLIT)
  const splitRatioRef = useRef(splitRatio)
  splitRatioRef.current = splitRatio

  const initSplitRatio = useCallback((saved: number | undefined) => {
    if (typeof saved === 'number') {
      setSplitRatio(Math.min(TEXT_EDITOR_SPLIT_MAX, Math.max(TEXT_EDITOR_SPLIT_MIN, saved)))
    }
  }, [])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!splitDragRef.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      const next = Math.min(TEXT_EDITOR_SPLIT_MAX, Math.max(TEXT_EDITOR_SPLIT_MIN, ratio))
      setSplitRatio(next)
    }

    const onMouseUp = () => {
      if (!splitDragRef.current) return
      splitDragRef.current = null
      const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
      const layout = (node?.data?.editorLayout as { splitRatio?: number } | undefined) ?? {}
      updateNodeData(nodeId, {
        editorLayout: { ...layout, splitRatio: splitRatioRef.current },
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [nodeId, updateNodeData])

  const startSplitDrag = (event: ReactMouseEvent) => {
    event.preventDefault()
    splitDragRef.current = { startX: event.clientX, startRatio: splitRatio }
  }

  return { splitContainerRef, splitRatio, startSplitDrag, initSplitRatio }
}
