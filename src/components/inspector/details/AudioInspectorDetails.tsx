import type { Edge, Node } from '@xyflow/react'
import { InspectorAdvanced } from '../InspectorAdvanced'
import { InspectorConnections } from '../InspectorConnections'
import { InspectorStatusChips, type StatusChip } from '../InspectorStatusChips'
import { InspectorStatusThumb } from '../InspectorStatusThumb'
import { InspectorSummary } from '../InspectorSummary'

interface Props {
  node: Node
  nodes: Node[]
  edges: Edge[]
}

export function AudioInspectorDetails({ node, nodes, edges }: Props) {
  const data = node.data as Record<string, unknown>
  const hasAsset = !!(data.audioSrc || data.audioAssetPath)
  const isGenerating = data.isGenerating === true
  const hasError = typeof data.error === 'string' && data.error.length > 0
  const text = (data.ttsText as string) || (data.prompt as string) || ''

  const chips: StatusChip[] = []
  if (isGenerating) chips.push({ label: '生成中', tone: 'accent' })
  else if (hasError) chips.push({ label: '失败', tone: 'error' })
  else if (hasAsset) chips.push({ label: '已导入', tone: 'success' })
  else chips.push({ label: '未导入', tone: 'default' })

  const summaryLines: (string | null)[] = []
  if (data.fileName) summaryLines.push(`文件 · ${String(data.fileName)}`)
  if (text) summaryLines.push(`文案 · ${text.length} 字`)

  return (
    <div className="space-y-4">
      <InspectorStatusThumb nodeId={node.id} hasAsset={hasAsset} kind="audio" />
      <InspectorStatusChips chips={chips} />
      <InspectorSummary lines={summaryLines} />
      <InspectorConnections nodeId={node.id} nodes={nodes} edges={edges} />
      <InspectorAdvanced node={node} />
      {hasError && <p className="text-xs text-danger">{String(data.error)}</p>}
    </div>
  )
}
