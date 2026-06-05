import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'
import { useComposeEditorStore } from '../../stores/composeEditorStore'
import type { ComposeClipItem } from '../../types/node'
import {
  getActiveClips,
  isComposeVideoHandle,
  requiredVideoInputCount,
  totalActiveDuration,
} from '../../utils/composeSequence'

function ComposeNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const edges = useCanvasStore((s) => s.edges)
  const openEditor = useComposeEditorStore((s) => s.open)

  const clips = (data.clips as ComposeClipItem[] | undefined) ?? []
  const active = getActiveClips(clips)
  const totalDuration = totalActiveDuration(clips)

  const connectedVideoCount = edges.filter(
    (e) => e.target === id && isComposeVideoHandle(e.targetHandle),
  ).length
  const videoInputCount = requiredVideoInputCount(clips, connectedVideoCount)

  const videoInputs = Array.from({ length: videoInputCount }, (_, i) => ({
    id: `video${i + 1}`,
    top: `${18 + (58 / videoInputCount) * i}%`,
  }))

  return (
    <BaseNode
      nodeId={id}
      color="var(--color-accent)"
      icon={<span className="text-sm">🎬</span>}
      title={`合成 · ${active.length} 片段`}
      selected={selected}
      width={width}
      height={height}
      defaultWidth={240}
      minWidth={200}
      minHeight={160}
      inputs={[...videoInputs, { id: 'audio', top: '88%' }]}
      outputs={[{ id: 'composed', top: '50%' }]}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-2 p-1">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1 py-4">
          {active.length === 0 ? (
            <p className="text-[11px] text-text-muted px-2">
              连接视频节点到左侧输入口
            </p>
          ) : (
            <>
              <p className="text-[11px] text-text-primary">{active.length} 个片段</p>
              <p className="text-[10px] text-text-muted">总时长 {totalDuration.toFixed(1)}s</p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => openEditor(id)}
          className="shrink-0 w-full text-[10px] px-2 py-1.5 bg-accent/20 text-accent border border-accent/30 rounded hover:bg-accent hover:text-white transition nodrag"
        >
          打开剪辑台
        </button>

        {typeof data.outputPath === 'string' && (
          <p className="shrink-0 text-[9px] text-success truncate text-center" title={data.outputPath as string}>
            ✓ 已导出成片
          </p>
        )}
      </div>
    </BaseNode>
  )
}

export const ComposeNode = memo(ComposeNodeComponent)
