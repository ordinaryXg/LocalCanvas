import type { Node } from '@xyflow/react'
import type { ScriptRow } from '../../../types/node'
import { InspectorStatusChips, type StatusChip } from '../InspectorStatusChips'
import { InspectorSummary } from '../InspectorSummary'

interface Props {
  node: Node
}

export function ScriptInspectorDetails({ node }: Props) {
  const data = node.data as Record<string, unknown>
  const rows = (data.scriptRows as ScriptRow[] | undefined) ?? []
  const rowAssets =
    (data.rowAssets as Record<number, { imageNodeId?: string; videoNodeId?: string }> | undefined) ??
    {}

  let imageLinked = 0
  let videoLinked = 0
  for (const row of rows) {
    const assets = rowAssets[row.sequence]
    if (assets?.imageNodeId) imageLinked++
    if (assets?.videoNodeId) videoLinked++
  }

  const chips: StatusChip[] = [{ label: `${rows.length} 行`, tone: 'default' }]
  if (imageLinked > 0) chips.push({ label: `${imageLinked} 张图`, tone: 'success' })
  if (videoLinked > 0) chips.push({ label: `${videoLinked} 个视频`, tone: 'success' })

  const summaryLines: (string | null)[] = []
  const story = (data.storyInput as string) || ''
  if (story) summaryLines.push(`故事梗概 · ${story.length} 字`)
  if (data.scriptTitle) summaryLines.push(`标题 · ${String(data.scriptTitle)}`)

  return (
    <div className="space-y-4">
      <InspectorStatusChips chips={chips} />
      <InspectorSummary lines={summaryLines} />
    </div>
  )
}
