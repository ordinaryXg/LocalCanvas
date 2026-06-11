import { memo, useEffect, useMemo, useRef } from 'react'
import type { NodeProps } from '@xyflow/react'
import { useOpenGeneratorDrawer } from '../inspector/useOpenGeneratorDrawer'
import { useStoryboardGroup } from '../../hooks/useStoryboardGroup'
import { useStoryboardEditorStore } from '../../stores/storyboardEditorStore'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { CANVAS_NODE_SHELL_PAD } from '../../utils/imageNodeDisplay'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'
import type { StoryboardFrame } from '../../types/storyboard'
import {
  frameHasVideoOnly,
  frameHasVisual,
  storyboardCanvasLayoutSpec,
  storyboardDisplayTitle,
  storyboardEmptyHint,
  storyboardFooterText,
  storyboardOverflowCount,
  storyboardPreviewFrames,
  storyboardStatusClass,
  STORYBOARD_EMPTY_HEIGHT,
} from '../../utils/storyboardNodeDisplay'

interface CellProps {
  frame: StoryboardFrame
  showOverflow?: number
  onClick?: (frameId: string) => void
}

function StoryboardStripCell({ frame, showOverflow, onClick }: CellProps) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { src, loading } = useLazyAssetBlob(projectId, frame.imagePath, frame.imageSrc)
  const hasVisual = frameHasVisual(frame)
  const videoOnly = frameHasVideoOnly(frame)

  return (
    <button
      type="button"
      className={`storyboard-node-strip__cell storyboard-node-strip__cell--interactive ${
        frame.status === 'failed' ? 'storyboard-node-strip__cell--failed' : ''
      } ${frame.status === 'generating' ? 'storyboard-node-strip__cell--generating' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(frame.id)
      }}
      title={`#${frame.sequence} · 点击在面板中聚焦`}
    >
      {hasVisual && src ? (
        <img src={src} alt="" className="storyboard-node-strip__thumb" draggable={false} />
      ) : (
        <div className="storyboard-node-strip__placeholder">
          {videoOnly ? (
            <span className="storyboard-node-strip__video-glyph" aria-hidden>
              ▶
            </span>
          ) : (
            <span className="storyboard-node-strip__sequence">#{frame.sequence}</span>
          )}
        </div>
      )}
      {loading && hasVisual && !src && (
        <div className="storyboard-node-strip__cell-loading" aria-hidden />
      )}
      <span
        className={`storyboard-node-strip__status ${storyboardStatusClass(frame.status)}`}
        aria-hidden
      />
      {showOverflow != null && showOverflow > 0 && (
        <div className="storyboard-node-strip__overflow" aria-hidden>
          +{showOverflow}
        </div>
      )}
    </button>
  )
}

function StoryboardStripListRow({ frame, onClick }: { frame: StoryboardFrame; onClick?: (frameId: string) => void }) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { src, loading } = useLazyAssetBlob(projectId, frame.imagePath, frame.imageSrc)
  const hasVisual = frameHasVisual(frame)
  const label = frame.description?.trim() || frame.prompt.trim()

  return (
    <button
      type="button"
      className={`storyboard-node-strip__list-row storyboard-node-strip__cell--interactive ${
        frame.status === 'failed' ? 'storyboard-node-strip__list-row--failed' : ''
      } ${frame.status === 'generating' ? 'storyboard-node-strip__cell--generating' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(frame.id)
      }}
      title={`#${frame.sequence} · 点击在面板中聚焦`}
    >
      <span className="storyboard-node-strip__list-thumb">
        {hasVisual && src ? (
          <img src={src} alt="" className="storyboard-node-strip__list-thumb-img" draggable={false} />
        ) : (
          <span className="storyboard-node-strip__list-seq">#{frame.sequence}</span>
        )}
        {loading && hasVisual && !src && (
          <span className="storyboard-node-strip__list-thumb-loading" aria-hidden />
        )}
      </span>
      <span className="storyboard-node-strip__list-label">
        #{frame.sequence}
        {label ? ` ${label}` : ''}
      </span>
      <span
        className={`storyboard-node-strip__list-status ${storyboardStatusClass(frame.status)}`}
        aria-hidden
      />
    </button>
  )
}

function StoryboardGroupNodeComponent({ id, data, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const { openDrawer } = useOpenGeneratorDrawer(id)
  const requestFrameFocus = useStoryboardEditorStore((s) => s.requestFrameFocus)
  const { frames, layout, generating, progress, selectSingleFrame } = useStoryboardGroup(id)
  const variant = useMemo(() => getNodeVisualVariant(id), [id])
  const layoutSpec = useMemo(() => storyboardCanvasLayoutSpec(layout), [layout])

  const name = typeof data.name === 'string' ? data.name : undefined
  const title = storyboardDisplayTitle(name)
  const isEmpty = frames.length === 0
  const previewFrames = storyboardPreviewFrames(frames, layout)
  const overflowCount = storyboardOverflowCount(frames, layout)
  const footer = isEmpty ? storyboardEmptyHint() : storyboardFooterText(frames)
  const isBusy = generating != null
  const isListLayout = layout === 'list'

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.ceil(shell.offsetWidth)
        const measuredHeight = Math.min(
          layoutSpec.maxHeight + CANVAS_NODE_SHELL_PAD * 2,
          Math.max(
            isEmpty ? STORYBOARD_EMPTY_HEIGHT : layoutSpec.minHeight,
            Math.ceil(shell.offsetHeight),
          ),
        )
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredWidth - lastW) < 2 && Math.abs(measuredHeight - lastH) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(id, measuredWidth, measuredHeight)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [frames.length, id, isEmpty, isBusy, layout, layoutSpec.maxHeight, layoutSpec.minHeight, updateNodeSize])

  const openEditor = () => {
    openDrawer()
  }

  const focusFrame = (frameId: string) => {
    selectSingleFrame(frameId)
    openDrawer()
    requestFrameFocus(id, frameId)
  }

  return (
    <div
      ref={shellRef}
      className="storyboard-node-shell"
      style={{
        maxWidth: layoutSpec.stripWidth + CANVAS_NODE_SHELL_PAD * 2,
        maxHeight: layoutSpec.maxHeight + CANVAS_NODE_SHELL_PAD * 2,
      }}
    >
      <div
        className={`storyboard-node-strip storyboard-node-strip--layout-${layout} ${
          selected ? 'storyboard-node-strip--selected' : ''
        } ${isEmpty ? 'storyboard-node-strip--empty' : ''}`}
        style={{
          borderRadius: variant.borderRadius,
          width: layoutSpec.stripWidth,
          minHeight: isEmpty ? STORYBOARD_EMPTY_HEIGHT : layoutSpec.minHeight,
        }}
        onDoubleClick={openEditor}
        title="双击在编辑台管理分镜帧"
      >
        {isEmpty ? (
          <div className="storyboard-node-strip__empty" aria-hidden>
            <span className="media-node__empty-icon">🎞️</span>
            <p className="storyboard-node-strip__empty-hint">{storyboardEmptyHint()}</p>
          </div>
        ) : (
          <>
            <p className="storyboard-node-strip__title">{title}</p>
            {isListLayout ? (
              <div className="storyboard-node-strip__list storyboard-node-strip__grid--interactive">
                {previewFrames.map((frame) => (
                  <StoryboardStripListRow key={frame.id} frame={frame} onClick={focusFrame} />
                ))}
                {overflowCount > 0 && (
                  <p className="storyboard-node-strip__list-more">+{overflowCount} 帧</p>
                )}
              </div>
            ) : (
              <div
                className="storyboard-node-strip__grid storyboard-node-strip__grid--interactive"
                style={{ gridTemplateColumns: `repeat(${layoutSpec.columns}, minmax(0, 1fr))` }}
              >
                {previewFrames.map((frame, index) => (
                  <StoryboardStripCell
                    key={frame.id}
                    frame={frame}
                    onClick={focusFrame}
                    showOverflow={
                      overflowCount > 0 && index === previewFrames.length - 1
                        ? overflowCount
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            <p className="storyboard-node-strip__footer">
              {isBusy ? `生成中… ${progress > 0 ? `${Math.round(progress)}%` : ''}` : footer}
            </p>
          </>
        )}

        {isBusy && (
          <div className="storyboard-node-strip__overlay" aria-hidden>
            <div className="storyboard-node-strip__spinner" />
          </div>
        )}
      </div>
    </div>
  )
}

export const StoryboardGroupNode = memo(StoryboardGroupNodeComponent)
