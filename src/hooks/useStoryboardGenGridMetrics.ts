import { useEffect, useRef, useState } from 'react'
import {
  computeStoryboardGenCellSize,
  STORYBOARD_GEN_CELL_GAP,
  STORYBOARD_GEN_CELL_SIZE_DEFAULT,
} from '../utils/storyboardNodeDisplay'
import type { StoryboardLayout } from '../types/storyboard'

export function useStoryboardGenGridMetrics(
  layout: StoryboardLayout,
  columns: number,
  frameCount: number,
  fillHeight: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(STORYBOARD_GEN_CELL_SIZE_DEFAULT)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el || columns <= 0 || frameCount <= 0) return

    const update = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      setViewportHeight(height)
      setCellSize(
        computeStoryboardGenCellSize(
          width,
          height,
          columns,
          frameCount,
          STORYBOARD_GEN_CELL_GAP,
          fillHeight,
          layout,
        ),
      )
    }

    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [columns, fillHeight, frameCount, layout])

  return { containerRef, cellSize, viewportHeight }
}
