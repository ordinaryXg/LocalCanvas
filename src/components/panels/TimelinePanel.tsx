import { useCallback, useEffect, useMemo, useState } from 'react'
import { Timeline, type TimelineTrack } from '../timeline/Timeline'
import { TimelinePreview, type PreviewClip } from '../timeline/TimelinePreview'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import {
  clipsFromComposeNode,
  finishComposeAndCreateVideoNode,
  resolveAssetAbsolutePath,
  runCompose,
  useComposeProgress,
} from '../../hooks/useCompose'
import { handleError, showToast } from '../../utils/ErrorHandler'
import type { ComposeClipItem } from '../../types/node'

export function TimelinePanel() {
  const nodes = useCanvasStore((s) => s.nodes)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [isComposing, setIsComposing] = useState(false)
  const [composeProgress, setComposeProgress] = useState(0)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [previewClips, setPreviewClips] = useState<PreviewClip[]>([])

  const composeNode = useMemo(
    () => nodes.find((n) => n.type === 'compose' && n.data.showTimeline),
    [nodes],
  )

  useComposeProgress(useCallback((pct) => setComposeProgress(pct), []))

  const tracks: TimelineTrack[] = useMemo(() => {
    if (!composeNode) return []
    const clips = (composeNode.data.clips as ComposeClipItem[] | undefined) ?? []
    const videoTrack: TimelineTrack = {
      id: 'video-track',
      type: 'video',
      clips: clips.map((c, i) => ({
        id: c.id || `clip-${i}`,
        name: c.name || `片段${i + 1}`,
        path: c.assetPath || '',
        duration: c.duration || 5,
        startTime: c.startTime ?? i * (c.duration || 5),
      })),
    }
    const audioTrack: TimelineTrack = {
      id: 'audio-track',
      type: 'audio',
      clips: composeNode.data.audioAssetPath
        ? [
            {
              id: 'audio-clip',
              name: '音频',
              path: composeNode.data.audioAssetPath as string,
              duration: videoTrack.clips.reduce((s, c) => s + c.duration, 0) || 10,
              startTime: 0,
            },
          ]
        : [],
    }
    return [videoTrack, audioTrack]
  }, [composeNode])

  useEffect(() => {
    if (!projectId || !composeNode) {
      setPreviewClips([])
      return
    }

    let cancelled = false
    void (async () => {
      const clips = (composeNode.data.clips as ComposeClipItem[] | undefined) ?? []
      const resolved: PreviewClip[] = []
      for (const [i, clip] of clips.entries()) {
        const relativePath = clip.assetPath || clip.absolutePath
        if (!relativePath) continue
        try {
          const absolutePath = clip.absolutePath
            ? clip.absolutePath
            : await resolveAssetAbsolutePath(projectId, clip.assetPath!)
          resolved.push({
            id: clip.id || `clip-${i}`,
            name: clip.name || `片段${i + 1}`,
            absolutePath,
            startTime: clip.startTime ?? 0,
            duration: clip.duration || 5,
          })
        } catch {
          /* skip broken clip */
        }
      }
      if (!cancelled) setPreviewClips(resolved)
    })()

    return () => {
      cancelled = true
    }
  }, [projectId, composeNode])

  const totalDuration = useMemo(() => {
    const videoClips = tracks[0]?.clips ?? []
    if (videoClips.length === 0) return 30
    return Math.max(...videoClips.map((c) => c.startTime + c.duration), 10)
  }, [tracks])

  if (!composeNode) return null

  const handleClose = () => {
    updateNodeData(composeNode.id, { showTimeline: false })
  }

  const handleClipMove = (trackId: string, clipId: string, newStartTime: number) => {
    if (trackId !== 'video-track') return
    const clips = ((composeNode.data.clips as ComposeClipItem[]) ?? []).map((c) =>
      c.id === clipId ? { ...c, startTime: newStartTime } : c,
    )
    updateNodeData(composeNode.id, { clips })
  }

  const handleCompose = async () => {
    if (!projectId) return
    setIsComposing(true)
    setComposeProgress(0)
    try {
      const clips = (composeNode.data.clips as ComposeClipItem[]) ?? []
      const outputPath = await runCompose(
        projectId,
        clipsFromComposeNode(clips),
        composeNode.data.audioAssetPath as string | undefined,
      )
      await finishComposeAndCreateVideoNode(composeNode.id, outputPath, projectId)
      showToast('合成完成，已在右侧创建视频节点', 'info')
    } catch (error) {
      handleError(error, 'compose')
    } finally {
      setIsComposing(false)
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div className="bg-bg-secondary/95 backdrop-blur border-t border-border">
        <div className="flex items-center justify-between px-6 py-2 border-b border-border">
          <span className="text-xs text-text-muted">🎬 合成时间轴</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-white text-xs"
          >
            收起 ▼
          </button>
        </div>
        <div className="px-2 pb-2 space-y-2">
          <TimelinePreview clips={previewClips} playheadTime={playheadTime} />
          <Timeline
            tracks={tracks}
            totalDuration={totalDuration}
            onClipMove={handleClipMove}
            onPlayheadChange={setPlayheadTime}
            onCompose={() => void handleCompose()}
            isComposing={isComposing}
            composeProgress={composeProgress}
            embedded
          />
        </div>
      </div>
    </div>
  )
}
