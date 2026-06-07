import type { Edge, Node } from '@xyflow/react'
import type { TextOutputMode } from '../../../types/node'
import { InspectorConnections } from '../InspectorConnections'
import { InspectorStatusChips, type StatusChip } from '../InspectorStatusChips'
import { InspectorSummary } from '../InspectorSummary'
import { countVisionImageEdges } from '../inspectorUtils'

interface Props {
  node: Node
  nodes: Node[]
  edges: Edge[]
}

function outputModeLabel(mode: TextOutputMode): string {
  return mode === 'generated' ? '下游读：AI 结果' : '下游读：输出栏'
}

export function TextInspectorDetails({ node, nodes, edges }: Props) {
  const data = node.data as Record<string, unknown>
  const draft = (data.draft as string) || ''
  const output = (data.output as string) || ''
  const outputMode = (data.outputMode as TextOutputMode | undefined) ?? 'passthrough'
  const isGenerating = data.isGenerating === true
  const visionCount = countVisionImageEdges(node.id, edges)

  const chips: StatusChip[] = [
    { label: outputModeLabel(outputMode), tone: outputMode === 'generated' ? 'accent' : 'default' },
  ]
  if (isGenerating) chips.push({ label: '生成中', tone: 'accent' })
  if (visionCount > 0) chips.push({ label: `${visionCount} 张参考图`, tone: 'default' })

  const summaryLines: (string | null)[] = []
  if (draft.length > 0) summaryLines.push(`草稿 · ${draft.length} 字`)
  if (output.length > 0) summaryLines.push(`输出 · ${output.length} 字`)

  return (
    <div className="space-y-4">
      <InspectorStatusChips chips={chips} />
      <InspectorSummary lines={summaryLines} />
      <InspectorConnections nodeId={node.id} nodes={nodes} edges={edges} />
    </div>
  )
}
