import type { Node } from '@xyflow/react'
import type { StoryboardFrame, StoryboardLayout } from '../../../types/storyboard'
import { STORYBOARD_LAYOUT_LABELS } from '../constants'
import { InspectorStatusChips, type StatusChip } from '../InspectorStatusChips'
import { InspectorSummary } from '../InspectorSummary'
import { storyboardSyncedFrameCount } from '../../../utils/storyboardNodeDisplay'

interface Props {
  node: Node
}

export function StoryboardInspectorDetails({ node }: Props) {
  const data = node.data as Record<string, unknown>
  const frames = (data.frames as StoryboardFrame[] | undefined) ?? []
  const selectedFrameIds = (data.selectedFrameIds as string[] | undefined) ?? []
  const layout = (data.layout as StoryboardLayout | undefined) ?? 'list'

  const withImage = frames.filter((f) => f.imageSrc || f.imagePath).length
  const syncedCount = storyboardSyncedFrameCount(frames)
  const failedCount = frames.filter((f) => f.status === 'failed').length

  const chips: StatusChip[] = [
    { label: `${frames.length} 帧`, tone: 'default' },
    { label: STORYBOARD_LAYOUT_LABELS[layout] ?? layout, tone: 'default' },
  ]
  if (syncedCount > 0) {
    chips.push({ label: `已同步 ${syncedCount} 帧`, tone: 'success' })
  }
  if (selectedFrameIds.length > 0) {
    chips.push({ label: `已选 ${selectedFrameIds.length}`, tone: 'accent' })
  }
  if (withImage > 0) chips.push({ label: `${withImage} 张图`, tone: 'success' })
  if (failedCount > 0) chips.push({ label: `${failedCount} 失败`, tone: 'error' })

  const previewFrames = frames.slice(0, 9)

  return (
    <div className="space-y-4">
      <InspectorStatusChips chips={chips} />
      <InspectorSummary
        lines={frames.length === 0 ? ['暂无分镜帧，可从脚本节点转换'] : []}
      />
      <p className="text-[10px] text-text-muted leading-relaxed">
        选中节点后底部展开分镜面板；双击画布节点可快速打开编辑。
      </p>
      {previewFrames.length > 0 && (
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {previewFrames.map((f) => (
            <div
              key={f.id}
              className="aspect-square rounded border border-border/60 bg-bg-tertiary/40 overflow-hidden flex items-center justify-center"
            >
              {f.imageSrc ? (
                <img src={f.imageSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-text-muted">#{f.sequence}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
