import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useOpenGeneratorDrawer } from '../inspector/useOpenGeneratorDrawer'
import { useCanvasStore } from '../../stores/canvasStore'
import { CANVAS_NODE_SHELL_PAD } from '../../utils/imageNodeDisplay'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'
import {
  formatScriptShotLine,
  scriptDisplayTitle,
  scriptEmptyHint,
  scriptFooterText,
  SCRIPT_BODY_MAX_HEIGHT,
  SCRIPT_EMPTY_HEIGHT,
  SCRIPT_MAX_HEIGHT,
  SCRIPT_MIN_HEIGHT,
  SCRIPT_STRIP_WIDTH,
  scriptTotalDuration,
  truncateSynopsis,
} from '../../utils/scriptNodeDisplay'
import type { ScriptRow } from '../../types/node'

function ScriptNodeComponent({ id, data, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const { openDrawer } = useOpenGeneratorDrawer(id)
  const variant = useMemo(() => getNodeVisualVariant(id), [id])
  const [clipped, setClipped] = useState(false)

  const rows = ((data.scriptRows as ScriptRow[] | undefined) ?? []).slice().sort(
    (a, b) => a.sequence - b.sequence,
  )
  const storyInput = typeof data.storyInput === 'string' ? data.storyInput : ''
  const scriptTitle = typeof data.scriptTitle === 'string' ? data.scriptTitle : ''
  const isGenerating = data.isGenerating === true
  const progress = typeof data.progress === 'number' ? data.progress : 0

  const synopsis = storyInput.trim()
  const hasRows = rows.length > 0
  const isEmpty = !hasRows && !synopsis && !scriptTitle.trim()
  const hasSynopsisOnly = !hasRows && !!synopsis
  const totalDuration = scriptTotalDuration(rows)
  const title = scriptDisplayTitle(scriptTitle)
  const footer = hasRows ? scriptFooterText(rows.length, totalDuration) : '0 镜'

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body || isEmpty) {
      setClipped(false)
      return
    }
    setClipped(body.scrollHeight > body.clientHeight + 1)
  }, [isEmpty, rows, synopsis, title])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.ceil(shell.offsetWidth)
        const measuredHeight = Math.min(
          SCRIPT_MAX_HEIGHT + CANVAS_NODE_SHELL_PAD * 2,
          Math.max(SCRIPT_MIN_HEIGHT, Math.ceil(shell.offsetHeight)),
        )
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredWidth - lastW) < 2 && Math.abs(measuredHeight - lastH) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(id, measuredWidth, measuredHeight)

        const body = bodyRef.current
        if (body && !isEmpty) {
          setClipped(body.scrollHeight > body.clientHeight + 1)
        }
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [hasRows, id, isEmpty, rows, synopsis, title, updateNodeSize])

  const openEditor = () => {
    openDrawer()
  }

  return (
    <div ref={shellRef} className="script-node-shell">
      <div
        className={`script-node-strip ${selected ? 'script-node-strip--selected' : ''} ${
          isEmpty ? 'script-node-strip--empty' : ''
        }`}
        style={{
          borderRadius: variant.borderRadius,
          width: SCRIPT_STRIP_WIDTH,
          minHeight: isEmpty ? SCRIPT_EMPTY_HEIGHT : undefined,
        }}
        onDoubleClick={openEditor}
        title="双击在编辑台编辑分镜脚本"
      >
        {isEmpty ? (
          <p className="script-node-strip__empty-hint">{scriptEmptyHint()}</p>
        ) : (
          <>
            <p className="script-node-strip__title">{title}</p>
            <div
              ref={bodyRef}
              className="script-node-strip__body"
              style={{ maxHeight: SCRIPT_BODY_MAX_HEIGHT }}
            >
              {hasSynopsisOnly && (
                <p className="script-node-strip__synopsis">{truncateSynopsis(synopsis)}</p>
              )}
              {hasRows &&
                rows.map((row) => (
                  <p key={row.id} className="script-node-strip__line">
                    {formatScriptShotLine(row)}
                  </p>
                ))}
              {clipped && <div className="script-node-strip__fade" aria-hidden />}
            </div>
            <p className="script-node-strip__footer">{footer}</p>
          </>
        )}

        {isGenerating && (
          <div className="script-node-strip__overlay" aria-hidden>
            <div className="script-node-strip__spinner" />
            {progress > 0 && (
              <span className="script-node-strip__progress">{Math.round(progress)}%</span>
            )}
          </div>
        )}

        <Handle
          type="source"
          position={Position.Right}
          id="script"
          className="script-node-strip__handle"
          style={{ top: '50%' }}
        />
      </div>
    </div>
  )
}

export const ScriptNode = memo(ScriptNodeComponent)
