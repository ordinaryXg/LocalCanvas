import type { Node } from '@xyflow/react'
import type { ComposeClipItem } from '../../../types/node'
import { InspectorField } from '../InspectorField'
import { InspectorSection } from '../InspectorSection'
import { InspectorStatusChips, type StatusChip } from '../InspectorStatusChips'
import { InspectorSummary } from '../InspectorSummary'

interface Props {
  node: Node
}

function clipStats(clips: ComposeClipItem[]) {
  const active = clips.filter((c) => !c.excluded)
  const totalSec = active.reduce((sum, c) => sum + (c.duration ?? 0), 0)
  return { activeCount: active.length, totalSec }
}

export function ComposeInspectorDetails({ node }: Props) {
  const data = node.data as Record<string, unknown>
  const clips = (data.clips as ComposeClipItem[] | undefined) ?? []
  const { activeCount, totalSec } = clipStats(clips)
  const exportPath = (data.composedOutputPath as string) || (data.lastExportPath as string) || ''

  const chips: StatusChip[] = [
    { label: `${activeCount} 片段`, tone: 'default' },
    { label: `${totalSec.toFixed(1)}s`, tone: 'default' },
  ]
  if (exportPath) chips.push({ label: '已导出', tone: 'success' })

  const summaryLines: (string | null)[] = []
  if (exportPath) {
    const name = exportPath.split(/[/\\]/).pop()
    summaryLines.push(`上次导出 · ${name}`)
  }

  return (
    <div className="space-y-4">
      <InspectorStatusChips chips={chips} />
      <InspectorSummary lines={summaryLines} />
      <p className="text-[10px] text-text-muted leading-relaxed">
        选中节点后底部展开剪辑台；双击画布节点可进入工作台全屏剪辑。
      </p>
      <InspectorSection title="合成">
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5">
          <InspectorField label="有效片段" value={activeCount} />
          <InspectorField label="总时长" value={`${totalSec.toFixed(1)}s`} />
        </div>
      </InspectorSection>
    </div>
  )
}
