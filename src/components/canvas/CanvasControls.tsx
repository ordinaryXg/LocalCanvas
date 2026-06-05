import { useCallback, type ReactNode } from 'react'
import { Panel, useReactFlow } from '@xyflow/react'
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from '../../utils/constants'

interface CanvasControlsProps {
  isInteractive: boolean
  onInteractiveChange: (interactive: boolean) => void
  onAutoLayout: () => void
}

function ControlBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="canvas-control-btn"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function CanvasControls({
  isInteractive,
  onInteractiveChange,
  onAutoLayout,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow()

  const handleFitView = useCallback(() => {
    void fitView({ padding: 0.2, duration: 280 })
  }, [fitView])

  const atMinZoom = getZoom() <= CANVAS_MIN_ZOOM
  const atMaxZoom = getZoom() >= CANVAS_MAX_ZOOM

  return (
    <Panel position="bottom-left" className="canvas-controls-panel">
      <div className="canvas-controls controls-dark">
        <ControlBtn title="放大画布" onClick={() => zoomIn()} disabled={atMaxZoom}>
          <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden>
            <path d="M16 6v20M6 16h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </ControlBtn>
        <ControlBtn title="缩小画布" onClick={() => zoomOut()} disabled={atMinZoom}>
          <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden>
            <path d="M6 16h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </ControlBtn>
        <ControlBtn title="适应画布：将所有节点缩放到可见区域" onClick={handleFitView}>
          <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden>
            <path
              d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </ControlBtn>
        <ControlBtn
          title={
            isInteractive
              ? '锁定编辑：禁止拖动节点、连线与框选（中键仍可平移）'
              : '解锁编辑：恢复拖动节点、连线与框选'
          }
          onClick={() => onInteractiveChange(!isInteractive)}
        >
          {isInteractive ? (
            <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden>
              <path
                d="M10 14V10a6 6 0 0 1 12 0v4M8 14h16v12H8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden>
              <path
                d="M10 14V10a6 6 0 0 1 11-2M8 14h16v12H8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </ControlBtn>
        <ControlBtn
          title="一键排版：按连线关系从左到右自动整理节点位置"
          onClick={onAutoLayout}
        >
          <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden>
            <rect x="4" y="6" width="8" height="6" rx="1" fill="currentColor" opacity="0.85" />
            <rect x="20" y="6" width="8" height="6" rx="1" fill="currentColor" opacity="0.85" />
            <rect x="12" y="20" width="8" height="6" rx="1" fill="currentColor" opacity="0.85" />
            <path
              d="M12 9h8M16 12v5M12 23h-4M20 23h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </ControlBtn>
      </div>
    </Panel>
  )
}
