import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useComposeEditorStore } from '../../stores/composeEditorStore'
import {
  clipsFromComposeNode,
  finishComposeAndCreateVideoNode,
  resolveAssetAbsolutePath,
  runCompose,
  useComposeProgress,
} from '../../hooks/useCompose'
import { useComposePlayback } from '../../hooks/useComposePlayback'
import { handleError, showToast } from '../../utils/ErrorHandler'
import type { ComposeClipItem } from '../../types/node'
import { parseSrt, type SubtitleCue } from '../../utils/parseSrt'
import {
  applySequentialStartTimes,
  getActiveClips,
  totalActiveDuration,
} from '../../utils/composeSequence'
import { useT } from '../../i18n'
import { ComposeToolbar } from './ComposeToolbar'
import { ComposePreview, type PreviewClip } from './ComposePreview'
import { ComposeTimeline } from './ComposeTimeline'
import { ComposeInspector } from './ComposeInspector'
import { ComposeExportDrawer } from './ComposeExportDrawer'

interface Props {
  nodeId: string
  /** 工作台内嵌：占满父容器，不再使用画布底部 75% 浮层 */
  embedded?: boolean
}

export function ComposeEditor({ nodeId, embedded = false }: Props) {
  const t = useT()
  const focusMode = useComposeEditorStore((s) => s.focusMode)
  const setFocusMode = useComposeEditorStore((s) => s.setFocusMode)
  const closeEditor = useComposeEditorStore((s) => s.close)

  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const setSelectedNodes = useCanvasStore((s) => s.setSelectedNodes)
  const removeEdge = useCanvasStore((s) => s.removeEdge)

  const projectId = useProjectStore((s) => s.currentProjectId)
  const containerRef = useRef<HTMLDivElement>(null)

  const composeNode = nodes.find((n) => n.id === nodeId)
  const clips = (composeNode?.data.clips as ComposeClipItem[] | undefined) ?? []
  const subtitleCues = (composeNode?.data.subtitleCues as SubtitleCue[] | undefined) ?? []

  const layout = (composeNode?.data.editorLayout as {
    previewHeight?: number
    pixelsPerSecond?: number
  }) ?? {}

  const [previewHeight, setPreviewHeight] = useState(layout.previewHeight ?? 200)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(layout.pixelsPerSecond ?? 60)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [audioSelected, setAudioSelected] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [composeProgress, setComposeProgress] = useState(0)
  const [reencode, setReencode] = useState(false)
  const [burnSubtitles, setBurnSubtitles] = useState(
    () => (composeNode?.data.burnSubtitles as boolean) ?? false,
  )
  const [previewClips, setPreviewClips] = useState<PreviewClip[]>([])
  const [clipPaths, setClipPaths] = useState<Record<string, string>>({})
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    clipId: string
  } | null>(null)

  const totalDuration = useMemo(() => {
    const d = totalActiveDuration(clips)
    return d > 0 ? d : 30
  }, [clips])

  const { playheadTime, isPlaying, seek, toggle, pause, setPlayheadTime } =
    useComposePlayback(totalDuration)

  useComposeProgress(useCallback((pct) => setComposeProgress(pct), []))

  const audioVolume = (composeNode?.data.audioVolume as number) ?? 1
  const audioFadeIn = (composeNode?.data.audioFadeIn as number) ?? 0
  const audioFadeOut = (composeNode?.data.audioFadeOut as number) ?? 0

  const persistLayout = useCallback(
    (patch: { previewHeight?: number; pixelsPerSecond?: number }) => {
      updateNodeData(nodeId, {
        editorLayout: { ...layout, ...patch },
      })
    },
    [nodeId, layout, updateNodeData],
  )

  const updateClips = useCallback(
    (next: ComposeClipItem[]) => {
      updateNodeData(nodeId, { clips: applySequentialStartTimes(next) })
    },
    [nodeId, updateNodeData],
  )

  useEffect(() => {
    if (!projectId || !composeNode) {
      setPreviewClips([])
      setClipPaths({})
      return
    }

    let cancelled = false
    void (async () => {
      const resolved: PreviewClip[] = []
      const paths: Record<string, string> = {}
      const sequential = applySequentialStartTimes(getActiveClips(clips))

      for (const clip of sequential) {
        const relativePath = clip.assetPath || clip.absolutePath
        if (!relativePath) continue
        try {
          const absolutePath = clip.absolutePath
            ? clip.absolutePath
            : await resolveAssetAbsolutePath(projectId, clip.assetPath!)
          paths[clip.id] = absolutePath
          resolved.push({
            id: clip.id,
            name: clip.name,
            absolutePath,
            startTime: clip.startTime ?? 0,
            duration: clip.duration || 5,
            trimIn: clip.trimIn ?? 0,
          })
        } catch {
          /* skip */
        }
      }
      if (!cancelled) {
        setPreviewClips(resolved)
        setClipPaths(paths)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [projectId, composeNode, clips])

  const handleExport = async () => {
    if (!projectId || !composeNode || getActiveClips(clips).length === 0) return
    setIsComposing(true)
    setComposeProgress(0)
    pause()
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
        audioVolume,
        audioFadeIn,
        audioFadeOut,
      )
      await finishComposeAndCreateVideoNode(nodeId, outputPath, projectId)
      showToast('合成完成，已在画布创建视频节点', 'info')
    } catch (error) {
      handleError(error, 'compose')
    } finally {
      setIsComposing(false)
    }
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

  const handleClipContextMenu = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, clipId })
  }

  const excludeClip = (clipId: string) => {
    updateClips(clips.map((c) => (c.id === clipId ? { ...c, excluded: true } : c)))
    if (selectedClipId === clipId) setSelectedClipId(null)
    setContextMenu(null)
  }

  const includeClip = (clipId: string) => {
    updateClips(clips.map((c) => (c.id === clipId ? { ...c, excluded: false } : c)))
    setContextMenu(null)
  }

  const disconnectClip = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId)
    if (!clip?.sourceNodeId) return
    const edge = edges.find(
      (e) =>
        e.target === nodeId &&
        e.source === clip.sourceNodeId &&
        e.targetHandle &&
        clip.id.endsWith(`-${e.targetHandle}`),
    )
    if (edge) removeEdge(edge.id)
    setContextMenu(null)
    if (selectedClipId === clipId) setSelectedClipId(null)
  }

  const handleOpenSourceNode = (sourceId: string) => {
    setSelectedNodes([sourceId])
    closeEditor()
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      if (
        target instanceof HTMLElement &&
        !el.contains(target) &&
        document.activeElement !== el
      ) {
        return
      }

      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seek(Math.max(0, playheadTime - 0.1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        seek(Math.min(totalDuration, playheadTime + 0.1))
      } else if (e.key === 'Home') {
        e.preventDefault()
        seek(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        seek(totalDuration)
      } else if (e.key === 'Delete' && selectedClipId) {
        e.preventDefault()
        excludeClip(selectedClipId)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle, seek, playheadTime, totalDuration, selectedClipId, clips])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  if (!composeNode) return null

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null
  const showInspector = inspectorOpen && (selectedClip || audioSelected)
  const activeClipCount = getActiveClips(clips).length
  const useFullHeight = embedded || focusMode

  return (
    <div
      ref={containerRef}
      className={
        embedded
          ? 'relative flex flex-col h-full w-full min-h-0 bg-bg-primary'
          : `absolute left-0 right-0 z-50 flex flex-col bg-bg-primary border-t border-border shadow-[0_-12px_40px_rgba(0,0,0,0.45)] ${
              useFullHeight ? 'top-0 bottom-0' : 'bottom-0'
            }`
      }
      style={embedded || useFullHeight ? undefined : { height: '75%' }}
      tabIndex={-1}
    >
      <ComposeToolbar
        clips={clips}
        isComposing={isComposing}
        composeProgress={composeProgress}
        focusMode={useFullHeight}
        embedded={embedded}
        onExport={() => void handleExport()}
        onCancelCompose={
          isComposing
            ? () => {
                void window.api.compose.cancel().finally(() => {
                  setIsComposing(false)
                  setComposeProgress(0)
                })
              }
            : undefined
        }
        onImportSubtitle={() => void handleImportSrt()}
        onToggleSettings={() => setSettingsOpen((o) => !o)}
        onToggleFocus={() => setFocusMode(!focusMode)}
        onClose={closeEditor}
        subtitleCount={subtitleCues.length}
      />

      <ComposeExportDrawer
        open={settingsOpen}
        reencode={reencode}
        burnSubtitles={burnSubtitles}
        hasSubtitles={subtitleCues.length > 0}
        onReencodeChange={setReencode}
        onBurnChange={(v) => {
          setBurnSubtitles(v)
          updateNodeData(nodeId, { burnSubtitles: v })
        }}
        onClose={() => setSettingsOpen(false)}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <ComposePreview
            clips={previewClips}
            timelineClipCount={activeClipCount}
            playheadTime={playheadTime}
            totalDuration={totalDuration}
            subtitleCues={subtitleCues}
            isPlaying={isPlaying}
            previewHeight={previewHeight}
            onPreviewHeightChange={(h) => {
              setPreviewHeight(h)
              persistLayout({ previewHeight: h })
            }}
            onTogglePlay={toggle}
            onSeek={(t) => {
              pause()
              seek(t)
            }}
          />

          <ComposeTimeline
            clips={clips}
            clipPaths={clipPaths}
            subtitleCues={subtitleCues}
            playheadTime={playheadTime}
            totalDuration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            hasAudio={!!composeNode.data.audioAssetPath}
            selectedClipId={selectedClipId}
            onClipsChange={updateClips}
            onSelectClip={(id) => {
              setSelectedClipId(id)
              setAudioSelected(false)
              setInspectorOpen(!!id)
              if (id) {
                const clip = clips.find((c) => c.id === id)
                if (clip?.startTime != null) setPlayheadTime(clip.startTime)
              }
            }}
            onSelectAudio={() => {
              setAudioSelected(true)
              setSelectedClipId(null)
              setInspectorOpen(true)
            }}
            onPlayheadChange={(t) => {
              pause()
              seek(t)
            }}
            onClipContextMenu={handleClipContextMenu}
            onPixelsPerSecondChange={(pps) => {
              setPixelsPerSecond(pps)
              persistLayout({ pixelsPerSecond: pps })
            }}
          />
        </div>

        {showInspector && (
          <ComposeInspector
            clip={selectedClip}
            audioSelected={audioSelected}
            audioVolume={audioVolume}
            audioFadeIn={audioFadeIn}
            audioFadeOut={audioFadeOut}
            onClipUpdate={(clipId, patch) => {
              updateClips(
                clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
              )
            }}
            onAudioVolumeChange={(v) => updateNodeData(nodeId, { audioVolume: v })}
            onAudioFadeInChange={(v) => updateNodeData(nodeId, { audioFadeIn: v })}
            onAudioFadeOutChange={(v) => updateNodeData(nodeId, { audioFadeOut: v })}
            onOpenSourceNode={handleOpenSourceNode}
            onClose={() => {
              setInspectorOpen(false)
              setAudioSelected(false)
              setSelectedClipId(null)
            }}
          />
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-[60] bg-bg-secondary border border-border rounded shadow-lg py-1 text-xs min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {clips.find((c) => c.id === contextMenu.clipId)?.excluded ? (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary"
              onClick={() => includeClip(contextMenu.clipId)}
            >
              恢复至成片
            </button>
          ) : (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary"
              onClick={() => excludeClip(contextMenu.clipId)}
            >
              从成片排除
            </button>
          )}
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary text-danger"
            onClick={() => disconnectClip(contextMenu.clipId)}
          >
            断开连线
          </button>
        </div>
      )}
    </div>
  )
}
