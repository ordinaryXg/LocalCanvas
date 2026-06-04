import { memo, useCallback, useMemo, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import {
  clipsFromComposeNode,
  finishComposeAndCreateVideoNode,
  runCompose,
  useComposeProgress,
} from '../../hooks/useCompose'
import { handleError, showToast } from '../../utils/ErrorHandler'
import type { ComposeClipItem } from '../../types/node'

function ComposeNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const clips = (data.clips as ComposeClipItem[] | undefined) ?? []
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [isComposing, setIsComposing] = useState(false)
  const [composeProgress, setComposeProgress] = useState(0)

  const totalDuration = clips.reduce((sum, c) => sum + (c.duration || 0), 0)
  const showTimeline = !!data.showTimeline

  useComposeProgress(useCallback((pct) => setComposeProgress(pct), []))

  const handleCompose = useCallback(async () => {
    if (!projectId || clips.length === 0) return
    setIsComposing(true)
    setComposeProgress(0)
    try {
      const outputPath = await runCompose(
        projectId,
        clipsFromComposeNode(clips),
        data.audioAssetPath as string | undefined,
      )
      await finishComposeAndCreateVideoNode(id, outputPath, projectId)
      showToast('合成完成，已在右侧创建视频节点', 'info')
    } catch (error) {
      handleError(error, 'compose')
    } finally {
      setIsComposing(false)
    }
  }, [projectId, clips, data.audioAssetPath, id])

  const toggleTimeline = useCallback(() => {
    updateNodeData(id, { showTimeline: !showTimeline })
  }, [showTimeline, id, updateNodeData])

  return (
    <BaseNode
      color="var(--color-accent)"
      icon={<span className="text-sm">🎬</span>}
      title={`合成 · ${clips.length} 片段`}
      selected={selected}
      width={width}
      height={height}
      defaultWidth={260}
      minWidth={220}
      minHeight={300}
      inputs={[
        { id: 'video1', top: '22%' },
        { id: 'video2', top: '40%' },
        { id: 'video3', top: '58%' },
        { id: 'audio', top: '76%' },
      ]}
      outputs={[{ id: 'composed', top: '50%' }]}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-2">
        <div className="flex-1 min-h-0 max-h-[140px] overflow-y-auto nowheel space-y-1 rounded border border-border/50 bg-bg-tertiary/30 p-1">
          {clips.length === 0 ? (
            <div className="text-[11px] text-text-muted text-center py-6">
              连接视频节点到左侧输入口
            </div>
          ) : (
            clips.map((clip, i) => (
              <div
                key={clip.id || i}
                className="flex items-center gap-2 bg-bg-tertiary rounded px-2 py-1"
              >
                <span className="text-[10px] text-text-muted shrink-0 w-4">{i + 1}</span>
                <span className="text-[10px] text-text-primary truncate flex-1 min-w-0">
                  {clip.name || `片段${i + 1}`}
                </span>
                <span className="text-[10px] text-text-muted shrink-0">
                  {clip.duration?.toFixed(1)}s
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between shrink-0 gap-1">
          <span className="text-[10px] text-text-muted">总时长 {totalDuration.toFixed(1)}s</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={toggleTimeline}
              className="text-[10px] px-2 py-1 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-primary nodrag"
            >
              {showTimeline ? '收起' : '时间轴'}
            </button>
            <button
              type="button"
              onClick={() => void handleCompose()}
              disabled={clips.length === 0 || isComposing}
              className="text-[10px] px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 nodrag"
            >
              {isComposing ? `${composeProgress}%` : '合成'}
            </button>
          </div>
        </div>

        {isComposing && composeProgress > 0 && (
          <div className="shrink-0 w-full bg-bg-tertiary rounded-full h-1">
            <div
              className="bg-accent h-1 rounded-full transition-all"
              style={{ width: `${composeProgress}%` }}
            />
          </div>
        )}

        {typeof data.outputPath === 'string' && (
          <p className="shrink-0 text-[9px] text-success truncate" title={data.outputPath as string}>
            ✓ 已导出成片
          </p>
        )}

        <div className="shrink-0 min-h-[12px]" />
      </div>
    </BaseNode>
  )
}

export const ComposeNode = memo(ComposeNodeComponent)
