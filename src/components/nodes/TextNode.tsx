import { memo, useMemo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { getTextNodePorts } from '../../capabilities/node-port-ui'
import { applyPortSlotLabels, getTextPortSlotLabels } from '../../capabilities/port-slot-labels'
import { useCanvasStore } from '../../stores/canvasStore'
import { listLlmVisionImageHandles } from '../../utils/llmVisionSlots'
import { TextOutputBadge } from '../text/TextOutputBadge'
import { useTextEditorStore } from '../../stores/textEditorStore'
import { normalizeTextNodeData, previewLines, textCharStats } from '../../utils/textNodeOutput'

function TextNodeComponent({ id, data: rawData, selected, width, height }: NodeProps) {
  const requestFocusDraft = useTextEditorStore((s) => s.requestFocusDraft)
  const edges = useCanvasStore((s) => s.edges)
  const data = normalizeTextNodeData((rawData ?? {}) as Record<string, unknown>)
  const modelId = typeof data.modelId === 'string' ? data.modelId : undefined

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

  const output = data.output ?? ''
  const title = data.title ?? '文本'
  const outputMode = data.outputMode ?? 'passthrough'
  const isEmpty = !output.trim()

  return (
    <BaseNode
      nodeId={id}
      color="var(--node-text)"
      icon={<span className="text-sm">📝</span>}
      title={title}
      selected={selected}
      width={width}
      height={height}
      defaultWidth={280}
      minWidth={240}
      minHeight={160}
      resizable
      inputs={inputPorts}
      outputs={[{ id: 'prompt', top: '62%' }]}
    >
      <div
        className="w-full flex flex-col flex-1 min-h-0 gap-2 nodrag"
        onDoubleClick={() => requestFocusDraft()}
      >
        <div
          className={`relative rounded-md border p-2 min-h-[72px] max-h-[100px] overflow-hidden ${
            outputMode === 'generated' ? 'bg-accent/5 border-accent/25' : 'bg-bg-tertiary/40 border-border'
          }`}
        >
          {isEmpty ? (
            <p className="text-[11px] text-text-muted italic leading-relaxed">
              {data.draft?.trim()
                ? '草稿已就绪，请同步或生成输出'
                : '选中后在底部面板编辑'}
            </p>
          ) : (
            <pre className="text-[11px] text-text-primary whitespace-pre-wrap break-words leading-relaxed font-sans m-0">
              {previewLines(output, 3)}
            </pre>
          )}
          {!isEmpty && output.split('\n').length > 3 && (
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-bg-secondary/90 to-transparent pointer-events-none" />
          )}
        </div>

        <div className="flex items-center justify-between shrink-0 gap-2">
          <TextOutputBadge mode={outputMode} edited={data.outputEdited} />
          <span className="text-[9px] text-text-muted">{textCharStats(output)}</span>
        </div>

        <button
          type="button"
          onClick={() => requestFocusDraft()}
          className="shrink-0 w-full text-[10px] py-1.5 bg-accent/15 text-accent border border-accent/30 rounded hover:bg-accent hover:text-white transition"
        >
          打开编辑
        </button>
      </div>
    </BaseNode>
  )
}

export const TextNode = memo(TextNodeComponent)
