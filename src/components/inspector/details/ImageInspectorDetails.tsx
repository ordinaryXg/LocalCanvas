import { useMemo } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { collectInboundEdgeWarnings } from '../../../capabilities/edge-compat'
import { GENERATION_CONSUMED_HANDLES } from '../../../capabilities/generation-guard'
import { getStylePreset } from '../../../constants/stylePresets'
import { InspectorAdvanced } from '../InspectorAdvanced'
import { InspectorConnections } from '../InspectorConnections'
import { InspectorHealth } from '../InspectorHealth'
import { InspectorStatusChips, type StatusChip } from '../InspectorStatusChips'
import { InspectorStatusThumb } from '../InspectorStatusThumb'
import { InspectorSummary } from '../InspectorSummary'
import { findPromptSourceNode, promptSourceLabel } from '../inspectorUtils'
import { useModelNameMap } from '../useModelNameMap'
import { useOpenGeneratorDrawer } from '../useOpenGeneratorDrawer'

interface Props {
  node: Node
  nodes: Node[]
  edges: Edge[]
}

export function ImageInspectorDetails({ node, nodes, edges }: Props) {
  const data = node.data as Record<string, unknown>
  const modelNames = useModelNameMap()
  const { openDrawer, openDrawerWithWarnings, openDrawerFocusStyle } = useOpenGeneratorDrawer(node.id)

  const modelId = (data.modelId as string) || ''
  const styleId = (data.styleId as string) || ''
  const style = styleId ? getStylePreset(styleId) : undefined
  const hasAsset = !!(data.imageSrc || data.imageAssetPath)
  const prompt = (data.prompt as string) || ''
  const isGenerating = data.isGenerating === true
  const hasError = typeof data.error === 'string' && data.error.length > 0

  const warnings = useMemo(
    () => collectInboundEdgeWarnings(node.id, nodes, edges, GENERATION_CONSUMED_HANDLES.image),
    [node.id, nodes, edges],
  )

  const promptSource = findPromptSourceNode(node.id, nodes, edges)
  const sourceLabel = promptSourceLabel(promptSource)

  const chips: StatusChip[] = []
  if (isGenerating) chips.push({ label: '生成中', tone: 'accent' })
  else if (hasError) chips.push({ label: '失败', tone: 'error' })
  else if (hasAsset) chips.push({ label: '已生成', tone: 'success' })
  else chips.push({ label: '未生成', tone: 'default' })

  if (modelId) {
    chips.push({
      label: modelNames[modelId] ?? modelId,
      tone: 'default',
      onClick: openDrawer,
    })
  }
  if (style) {
    chips.push({
      label: style.name,
      tone: 'default',
      onClick: openDrawerFocusStyle,
    })
  }

  const summaryLines: (string | null)[] = []
  if (data.fileName) summaryLines.push(`文件 · ${String(data.fileName)}`)
  if (sourceLabel) summaryLines.push(`prompt ← ${sourceLabel}`)
  else if (prompt) summaryLines.push(`prompt · ${prompt.length} 字`)
  else summaryLines.push('prompt · 未填写')

  return (
    <div className="space-y-4">
      <InspectorStatusThumb nodeId={node.id} hasAsset={hasAsset} kind="image" />
      <InspectorStatusChips chips={chips} />
      <InspectorSummary lines={summaryLines} />
      <InspectorConnections nodeId={node.id} nodes={nodes} edges={edges} />
      <InspectorHealth warningCount={warnings.length} onView={openDrawerWithWarnings} />
      <InspectorAdvanced node={node} />
      {hasError && <p className="text-xs text-danger">{String(data.error)}</p>}
    </div>
  )
}
