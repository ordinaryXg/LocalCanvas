import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useProjectStore } from '../../stores/projectStore'
import { useStoryboardEditorStore } from '../../stores/storyboardEditorStore'
import type { StoryboardFrame, StoryboardLayout } from '../../types/storyboard'
import {
  frameHasVisual,
  storyboardLayoutColumns,
  STORYBOARD_GEN_CELL_GAP,
  STORYBOARD_GEN_CELL_SIZE,
  STORYBOARD_GEN_GRID5_VIRTUAL_THRESHOLD,
  storyboardGridRowCount,
  storyboardVirtualRowRange,
} from '../../utils/storyboardNodeDisplay'

interface FrameCellProps {
  frame: StoryboardFrame
  selected: boolean
  focused: boolean
  generating: boolean
  onToggleSelect: (frameId: string) => void
  onRetryImage?: (frameId: string) => void
  onRetryVideo?: (frameId: string) => void
}

const StoryboardFrameCell = memo(function StoryboardFrameCell({
  frame,
  selected,
  focused,
  generating,
  onToggleSelect,
  onRetryImage,
  onRetryVideo,
}: FrameCellProps) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { src, loading } = useLazyAssetBlob(projectId, frame.imagePath, frame.imageSrc)
  const hasVisual = frameHasVisual(frame)
  const isFailed = frame.status === 'failed'
  const canRetryVideo = isFailed && !!(frame.imagePath || frame.imageSrc)

  return (
    <div
      data-storyboard-frame={frame.id}
      className={`storyboard-gen-cell ${selected ? 'storyboard-gen-cell--selected' : ''} ${
        focused ? 'storyboard-gen-cell--focused' : ''
      } ${isFailed ? 'storyboard-gen-cell--failed' : ''}`}
    >
      <button
        type="button"
        className="storyboard-gen-cell__main nodrag"
        onClick={() => onToggleSelect(frame.id)}
        disabled={generating}
      >
        {hasVisual && src ? (
          <img src={src} alt="" className="storyboard-gen-cell__thumb" draggable={false} />
        ) : (
          <span className="storyboard-gen-cell__sequence">#{frame.sequence}</span>
        )}
        {loading && hasVisual && !src && <span className="storyboard-gen-cell__loading" />}
        <span
          className={`storyboard-gen-cell__status storyboard-gen-cell__status--${frame.status}`}
          aria-hidden
        />
      </button>
      {isFailed && (
        <div className="storyboard-gen-cell__retry-row nodrag">
          {canRetryVideo ? (
            <button
              type="button"
              className="storyboard-gen-cell__retry"
              disabled={generating}
              onClick={() => onRetryVideo?.(frame.id)}
            >
              重试视频
            </button>
          ) : (
            <button
              type="button"
              className="storyboard-gen-cell__retry"
              disabled={generating || !frame.prompt.trim()}
              onClick={() => onRetryImage?.(frame.id)}
            >
              重试
            </button>
          )}
        </div>
      )}
    </div>
  )
})

interface ListRowProps {
  frame: StoryboardFrame
  selected: boolean
  focused: boolean
  generating: boolean
  onToggleSelect: (frameId: string) => void
  onRetryImage?: (frameId: string) => void
  onRetryVideo?: (frameId: string) => void
}

function StoryboardListRow({
  frame,
  selected,
  focused,
  generating,
  onToggleSelect,
  onRetryImage,
  onRetryVideo,
}: ListRowProps) {
  const isFailed = frame.status === 'failed'
  return (
    <div
      data-storyboard-frame={frame.id}
      className={`storyboard-gen-list-row ${selected ? 'storyboard-gen-list-row--selected' : ''} ${
        focused ? 'storyboard-gen-list-row--focused' : ''
      }`}
    >
      <label className="storyboard-gen-list-row__label nodrag">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(frame.id)}
          disabled={generating}
        />
        <div className="storyboard-gen-list-row__body">
          <span className="storyboard-gen-list-row__title">
            #{frame.sequence} {frame.description || frame.prompt.slice(0, 36)}
          </span>
          <span className="storyboard-gen-list-row__meta">{frame.status}</span>
        </div>
      </label>
      {isFailed && (
        <button
          type="button"
          className="storyboard-gen-list-row__retry nodrag"
          disabled={generating}
          onClick={() =>
            frame.imagePath || frame.imageSrc
              ? onRetryVideo?.(frame.id)
              : onRetryImage?.(frame.id)
          }
        >
          重试
        </button>
      )}
    </div>
  )
}

interface VirtualGridProps {
  className?: string
  frames: StoryboardFrame[]
  columns: number
  selectedFrameIds: string[]
  focusFrameId: string | null
  generating: boolean
  onToggleSelect: (frameId: string) => void
  onRetryImage?: (frameId: string) => void
  onRetryVideo?: (frameId: string) => void
}

function VirtualStoryboardGrid({
  className,
  frames,
  columns,
  selectedFrameIds,
  focusFrameId,
  generating,
  onToggleSelect,
  onRetryImage,
  onRetryVideo,
}: VirtualGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(320)

  const rowHeight = STORYBOARD_GEN_CELL_SIZE + STORYBOARD_GEN_CELL_GAP
  const rowCount = storyboardGridRowCount(frames.length, columns)
  const totalHeight = rowCount * rowHeight - STORYBOARD_GEN_CELL_GAP
  const { startRow, endRow } = storyboardVirtualRowRange(
    scrollTop,
    viewportHeight,
    rowCount,
    rowHeight,
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight))
    ro.observe(el)
    setViewportHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const visibleCells = useMemo(() => {
    const items: Array<{ frame: StoryboardFrame; row: number; col: number }> = []
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col
        const frame = frames[index]
        if (frame) items.push({ frame, row, col })
      }
    }
    return items
  }, [columns, endRow, frames, startRow])

  return (
    <div
      ref={containerRef}
      className={`storyboard-gen-grid-virtual lc-scroll nowheel nodrag ${className ?? ''}`}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div className="storyboard-gen-grid-virtual__spacer" style={{ height: totalHeight }}>
        {visibleCells.map(({ frame, row, col }) => (
          <div
            key={frame.id}
            className="storyboard-gen-grid-virtual__item"
            style={{
              width: STORYBOARD_GEN_CELL_SIZE,
              height: STORYBOARD_GEN_CELL_SIZE,
              transform: `translate(${col * (STORYBOARD_GEN_CELL_SIZE + STORYBOARD_GEN_CELL_GAP)}px, ${
                row * rowHeight
              }px)`,
            }}
          >
            <StoryboardFrameCell
              frame={frame}
              selected={selectedFrameIds.includes(frame.id)}
              focused={focusFrameId === frame.id}
              generating={generating}
              onToggleSelect={onToggleSelect}
              onRetryImage={onRetryImage}
              onRetryVideo={onRetryVideo}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface BrowserProps {
  nodeId: string
  frames: StoryboardFrame[]
  layout: StoryboardLayout
  selectedFrameIds: string[]
  generating: boolean
  onToggleSelect: (frameId: string) => void
  onRetryImage: (frameId: string) => void
  onRetryVideo: (frameId: string) => void
  fillHeight?: boolean
}

export function StoryboardFrameBrowser({
  nodeId,
  frames,
  layout,
  selectedFrameIds,
  generating,
  onToggleSelect,
  onRetryImage,
  onRetryVideo,
  fillHeight = false,
}: BrowserProps) {
  const focusNodeId = useStoryboardEditorStore((s) => s.focusNodeId)
  const focusFrameId = useStoryboardEditorStore((s) => s.focusFrameId)
  const clearFrameFocus = useStoryboardEditorStore((s) => s.clearFrameFocus)
  const columns = storyboardLayoutColumns(layout)
  const activeFocusId = focusNodeId === nodeId ? focusFrameId : null

  const scrollToFrame = useCallback(
    (frameId: string) => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-storyboard-frame="${frameId}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [],
  )

  useEffect(() => {
    if (!activeFocusId) return
    scrollToFrame(activeFocusId)
    clearFrameFocus()
  }, [activeFocusId, clearFrameFocus, scrollToFrame])

  if (frames.length === 0) {
    return (
      <p className="storyboard-gen-empty text-[10px] text-text-muted text-center py-6">
        暂无分镜帧，可从脚本节点右键转换
      </p>
    )
  }

  const scrollClass = fillHeight
    ? 'storyboard-gen-scroll storyboard-gen-scroll--fill'
    : 'storyboard-gen-scroll'

  if (layout === 'list') {
    return (
      <div className={`storyboard-gen-list ${scrollClass} lc-scroll nowheel nodrag space-y-1`}>
        {frames.map((frame) => (
          <StoryboardListRow
            key={frame.id}
            frame={frame}
            selected={selectedFrameIds.includes(frame.id)}
            focused={activeFocusId === frame.id}
            generating={generating}
            onToggleSelect={onToggleSelect}
            onRetryImage={onRetryImage}
            onRetryVideo={onRetryVideo}
          />
        ))}
      </div>
    )
  }

  const useVirtual = layout === 'grid5' && frames.length >= STORYBOARD_GEN_GRID5_VIRTUAL_THRESHOLD

  if (useVirtual) {
    return (
      <VirtualStoryboardGrid
        className={scrollClass}
        frames={frames}
        columns={columns}
        selectedFrameIds={selectedFrameIds}
        focusFrameId={activeFocusId}
        generating={generating}
        onToggleSelect={onToggleSelect}
        onRetryImage={onRetryImage}
        onRetryVideo={onRetryVideo}
      />
    )
  }

  return (
    <div
      className={`storyboard-gen-grid ${scrollClass} lc-scroll nowheel nodrag`}
      style={{
        gridTemplateColumns: `repeat(${columns}, ${STORYBOARD_GEN_CELL_SIZE}px)`,
      }}
    >
      {frames.map((frame) => (
        <StoryboardFrameCell
          key={frame.id}
          frame={frame}
          selected={selectedFrameIds.includes(frame.id)}
          focused={activeFocusId === frame.id}
          generating={generating}
          onToggleSelect={onToggleSelect}
          onRetryImage={onRetryImage}
          onRetryVideo={onRetryVideo}
        />
      ))}
    </div>
  )
}
