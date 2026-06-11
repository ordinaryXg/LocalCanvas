import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getTextNodePorts } from '../../capabilities/node-port-ui'
import { applyPortSlotLabels, getTextPortSlotLabels } from '../../capabilities/port-slot-labels'
import { useOpenGeneratorDrawer } from '../inspector/useOpenGeneratorDrawer'
import { useCanvasStore } from '../../stores/canvasStore'
import { useTextEditorStore } from '../../stores/textEditorStore'
import { listLlmVisionImageHandles } from '../../utils/llmVisionSlots'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'
import { normalizeTextNodeData, textNodeOutput } from '../../utils/textNodeOutput'

const MIN_WIDTH = 148
const MIN_HEIGHT = 96
const MAX_WIDTH = 320
/** 便签本体（含内边距）最大高度 */
const MAX_NOTE_HEIGHT = 280
const SHELL_PAD = 8

function TextNodeComponent({ id, data: rawData, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLPreElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const [clipped, setClipped] = useState(false)
  const requestFocusDraft = useTextEditorStore((s) => s.requestFocusDraft)
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const { openDrawer } = useOpenGeneratorDrawer(id)
  const edges = useCanvasStore((s) => s.edges)
  const data = normalizeTextNodeData((rawData ?? {}) as Record<string, unknown>)
  const modelId = typeof data.modelId === 'string' ? data.modelId : undefined
  const isGenerating = data.isGenerating === true
  const progress = typeof data.progress === 'number' ? data.progress : 0
  const variant = useMemo(() => getNodeVisualVariant(id), [id])

  const inputPorts = useMemo(() => {
    const inbound = edges.filter((e) => e.target === id && e.targetHandle)
    const slotDisabled: Partial<Record<string, boolean>> = {}
    for (const handle of listLlmVisionImageHandles(20)) {
      if (inbound.some((e) => e.targetHandle === handle)) {
        slotDisabled[handle] = true
      }
    }
    if (inbound.some((e) => e.targetHandle === 'image')) {
      slotDisabled.image1 = true
    }
    const ports = getTextNodePorts(modelId, undefined, slotDisabled)
    const labels = getTextPortSlotLabels(id, edges, modelId)
    return applyPortSlotLabels(ports, labels)
  }, [edges, id, modelId])

  const displayText = textNodeOutput((rawData ?? {}) as Record<string, unknown>).trim()

  useLayoutEffect(() => {
    const pre = contentRef.current
    if (!pre || !displayText) {
      setClipped(false)
      return
    }
    setClipped(pre.scrollHeight > pre.clientHeight + 1)
  }, [displayText])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.max(MIN_WIDTH, Math.ceil(shell.offsetWidth))
        const measuredHeight = Math.min(
          MAX_NOTE_HEIGHT + SHELL_PAD * 2,
          Math.max(MIN_HEIGHT, Math.ceil(shell.offsetHeight)),
        )
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredWidth - lastW) < 2 && Math.abs(measuredHeight - lastH) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(id, measuredWidth, measuredHeight)

        const pre = contentRef.current
        if (pre && displayText) {
          setClipped(pre.scrollHeight > pre.clientHeight + 1)
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
  }, [displayText, id, updateNodeSize])

  const openEditor = () => {
    openDrawer()
    requestFocusDraft()
  }

  return (
    <div ref={shellRef} className="text-note-node-shell">
      <div
        className={`text-note-node ${selected ? 'text-note-node--selected' : ''}`}
        style={{
          borderRadius: variant.borderRadius,
        }}
        onDoubleClick={openEditor}
        title={displayText || '双击在编辑台编辑'}
      >
        {displayText ? (
          <div className="text-note-node__body">
            <pre ref={contentRef} className="text-note-node__content">
              {displayText}
            </pre>
            {clipped && <div className="text-note-node__fade" aria-hidden />}
          </div>
        ) : (
          <div className="text-note-node__blank" aria-hidden />
        )}

        {isGenerating && (
          <div className="text-note-node__overlay" aria-hidden>
            <div className="text-note-node__spinner" />
            {progress > 0 && (
              <span className="text-note-node__progress">{Math.round(progress)}%</span>
            )}
          </div>
        )}

        {inputPorts.map((port) => (
          <Handle
            key={`in-${port.id}`}
            type="target"
            position={Position.Left}
            id={port.id}
            isConnectable={port.disabled ? false : 1}
            className="text-note-node__handle"
            style={{ top: port.top ?? '50%' }}
          />
        ))}
        <Handle
          type="source"
          position={Position.Right}
          id="prompt"
          className="text-note-node__handle"
          style={{ top: '50%' }}
        />
      </div>
    </div>
  )
}

export const TextNode = memo(TextNodeComponent)
