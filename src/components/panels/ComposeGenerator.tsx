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
import { parseSrt, type SubtitleCue } from '../../utils/parseSrt'
import { SubtitleTrack } from '../timeline/SubtitleTrack'
import { useT } from '../../i18n'

interface ComposeGeneratorProps {
  nodeId: string
}

export function ComposeGenerator({ nodeId }: ComposeGeneratorProps) {
  const t = useT()
  const nodes = useCanvasStore((s) => s.nodes)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [isComposing, setIsComposing] = useState(false)
  const [composeProgress, setComposeProgress] = useState(0)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [previewClips, setPreviewClips] = useState<PreviewClip[]>([])
  const [reencode, setReencode] = useState(false)

  const composeNode = nodes.find((n) => n.id === nodeId)
  const clips = (composeNode?.data.clips as ComposeClipItem[] | undefined) ?? []
  const subtitleCues = (composeNode?.data.subtitleCues as SubtitleCue[] | undefined) ?? []
  const [burnSubtitles, setBurnSubtitles] = useState(
    () => (composeNode?.data.burnSubtitles as boolean) ?? false,
  )
  const totalClipDuration = clips.reduce((sum, c) => sum + (c.duration || 0), 0)

  useComposeProgress(useCallback((pct) => setComposeProgress(pct), []))

  const tracks: TimelineTrack[] = useMemo(() => {
    if (!composeNode) return []
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
              name: '背景音乐',
              path: composeNode.data.audioAssetPath as string,
              duration: videoTrack.clips.reduce((s, c) => s + c.duration, 0) || 10,
              startTime: 0,
            },
          ]
        : [],
    }
    return [videoTrack, audioTrack]
  }, [composeNode, clips])

  useEffect(() => {
    if (!projectId || !composeNode) {
      setPreviewClips([])
      return
    }

    let cancelled = false
    void (async () => {
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
  }, [projectId, composeNode, clips])

  const totalDuration = useMemo(() => {
    const videoClips = tracks[0]?.clips ?? []
    if (videoClips.length === 0) return 30
    return Math.max(...videoClips.map((c) => c.startTime + c.duration), 10)
  }, [tracks])

  if (!composeNode) return null

  const updateClips = (next: ComposeClipItem[]) => {
    updateNodeData(nodeId, { clips: next })
  }

  const handleClipMove = (trackId: string, clipId: string, newStartTime: number) => {
    if (trackId !== 'video-track') return
    updateClips(clips.map((c) => (c.id === clipId ? { ...c, startTime: newStartTime } : c)))
  }

  const handleDurationChange = (clipId: string, duration: number) => {
    const next = Math.max(0.5, duration)
    updateClips(clips.map((c) => (c.id === clipId ? { ...c, duration: next } : c)))
  }

  const handleRemoveClip = (clipId: string) => {
    updateClips(clips.filter((c) => c.id !== clipId))
  }

  const handleImportSrt = async () => {
    if (!projectId) return
    const filePath = await window.api.file.selectFile([
      { name: 'Subtitles', extensions: ['srt'] },
    ])
    if (!filePath) return
    try {
      const buffer = await window.api.file.readAbsolutePath(filePath)
      const text = new TextDecoder().decode(buffer)
      const cues = parseSrt(text)
      if (cues.length === 0) {
        showToast(t('subtitle.parseEmpty'), 'error')
        return
      }
      updateNodeData(nodeId, {
        subtitleCues: cues,
        subtitlePath: filePath,
        subtitleFileName: filePath.split(/[/\\]/).pop(),
      })
      showToast(`${t('subtitle.imported')} (${cues.length})`, 'info')
    } catch (error) {
      handleError(error, 'subtitleImport')
    }
  }

  const handleCompose = async () => {
    if (!projectId || !composeNode || clips.length === 0) return
    setIsComposing(true)
    setComposeProgress(0)
    try {
      const subtitlePath = composeNode.data.subtitlePath as string | undefined
      const outputPath = await runCompose(
        projectId,
        clipsFromComposeNode(clips),
        composeNode.data.audioAssetPath as string | undefined,
        undefined,
        reencode,
        burnSubtitles ? subtitlePath : undefined,
        burnSubtitles,
      )
      await finishComposeAndCreateVideoNode(nodeId, outputPath, projectId)
      showToast('合成完成，已在右侧创建视频节点', 'info')
    } catch (error) {
      handleError(error, 'compose')
    } finally {
      setIsComposing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
        <span>{clips.length} 个视频片段</span>
        <span>总时长 {totalClipDuration.toFixed(1)}s</span>
        {composeNode.data.audioAssetPath ? (
          <span className="text-emerald-400">已接入背景音乐</span>
        ) : (
          <span>可连接音频节点到合成节点</span>
        )}
        <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={reencode}
            onChange={(e) => setReencode(e.target.checked)}
            className="rounded"
          />
          强制重编码（格式不一致时）
        </label>
        <button
          type="button"
          onClick={() => void handleImportSrt()}
          className="px-2 py-0.5 border border-border rounded hover:border-accent/40"
        >
          {t('subtitle.import')}
        </button>
        {subtitleCues.length > 0 && (
          <span className="text-emerald-400">
            {t('subtitle.loaded')} ({subtitleCues.length})
          </span>
        )}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={burnSubtitles}
            onChange={(e) => {
              setBurnSubtitles(e.target.checked)
              updateNodeData(nodeId, { burnSubtitles: e.target.checked })
            }}
            disabled={subtitleCues.length === 0}
            className="rounded"
          />
          {t('subtitle.burn')}
        </label>
      </div>

      {clips.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[120px] overflow-y-auto lc-scroll nowheel">
          {clips.map((clip, index) => (
            <div
              key={clip.id || index}
              className="flex items-center gap-2 bg-bg-tertiary rounded px-2 py-1.5 border border-border/60"
            >
              <span className="text-[10px] text-text-muted w-4 shrink-0">{index + 1}</span>
              <span className="text-[10px] text-text-primary truncate flex-1 min-w-0">
                {clip.name || `片段${index + 1}`}
              </span>
              <label className="text-[10px] text-text-muted flex items-center gap-1 shrink-0">
                时长
                <input
                  type="number"
                  min={0.5}
                  step={0.1}
                  value={clip.duration ?? 5}
                  onChange={(e) =>
                    handleDurationChange(clip.id, parseFloat(e.target.value) || 0.5)
                  }
                  className="w-14 bg-bg-secondary text-text-primary text-[10px] px-1 py-0.5 rounded outline-none border border-border"
                />
                s
              </label>
              <button
                type="button"
                onClick={() => handleRemoveClip(clip.id)}
                className="text-danger hover:text-red-400 text-[10px] shrink-0"
                title="从时间轴移除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {clips.length === 0 ? (
        <p className="text-xs text-text-muted py-4 text-center border border-dashed border-border rounded-lg">
          将视频节点连接到合成节点左侧输入口，片段将出现在下方时间轴
        </p>
      ) : (
        <>
          <TimelinePreview
            clips={previewClips}
            playheadTime={playheadTime}
            subtitleCues={subtitleCues}
          />
          {subtitleCues.length > 0 && (
            <SubtitleTrack
              cues={subtitleCues}
              playheadTime={playheadTime}
              totalDuration={totalDuration}
              embedded
            />
          )}
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
        </>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleCompose()}
          disabled={clips.length === 0 || isComposing}
          className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition"
        >
          {isComposing ? `合成中 ${composeProgress}%` : '🎬 导出合成视频'}
        </button>
        <button
          type="button"
          onClick={() => void window.api.compose.openOutputDir()}
          className="px-3 py-1.5 text-xs text-text-muted border border-border rounded hover:text-white hover:border-accent/40"
        >
          打开输出目录
        </button>
        {typeof composeNode.data.outputPath === 'string' && (
          <span className="text-[10px] text-success truncate flex-1" title={composeNode.data.outputPath as string}>
            ✓ 上次导出成功
          </span>
        )}
      </div>
    </div>
  )
}
